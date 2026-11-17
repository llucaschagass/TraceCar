package br.com.tracecar.service;

import br.com.tracecar.domain.*;
import br.com.tracecar.repository.AreaRepository;
import br.com.tracecar.repository.MovimentacaoRepository;
import br.com.tracecar.repository.PontoLeituraRepository;
import br.com.tracecar.repository.VeiculoRepository;
import br.com.tracecar.web.dto.MapaDtos.EventoMovimentacao;
import br.com.tracecar.web.dto.MovimentacaoDtos.*;
import br.com.tracecar.web.dto.PageResponse;
import br.com.tracecar.web.exception.ConflitoException;
import br.com.tracecar.web.exception.RecursoNaoEncontradoException;
import br.com.tracecar.web.exception.RegraNegocioException;
import jakarta.persistence.criteria.Predicate;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Regra central do rastreamento: cada leitura em uma área nova encerra a permanência
 * anterior do veículo e abre uma nova. Leituras repetidas na mesma área são ignoradas
 * (portais RFID costumam ler a mesma tag várias vezes).
 */
@Service
public class MovimentacaoService {

    private static final Duration TOLERANCIA_RELOGIO = Duration.ofMinutes(5);

    private final MovimentacaoRepository movimentacaoRepository;
    private final VeiculoRepository veiculoRepository;
    private final AreaRepository areaRepository;
    private final PontoLeituraRepository pontoLeituraRepository;
    private final PontoLeituraService pontoLeituraService;
    private final AreaService areaService;
    private final ApplicationEventPublisher eventos;

    public MovimentacaoService(MovimentacaoRepository movimentacaoRepository, VeiculoRepository veiculoRepository,
                               AreaRepository areaRepository, PontoLeituraRepository pontoLeituraRepository,
                               PontoLeituraService pontoLeituraService, AreaService areaService,
                               ApplicationEventPublisher eventos) {
        this.movimentacaoRepository = movimentacaoRepository;
        this.veiculoRepository = veiculoRepository;
        this.areaRepository = areaRepository;
        this.pontoLeituraRepository = pontoLeituraRepository;
        this.pontoLeituraService = pontoLeituraService;
        this.areaService = areaService;
        this.eventos = eventos;
    }

    /** Identificação automática: dispositivo informa o ponto de leitura e o chassi/tag lido. */
    @Transactional
    public LeituraResponse registrarLeitura(LeituraRequest req) {
        PontoLeitura ponto = pontoLeituraService.obterPorCodigo(req.codigoPontoLeitura());
        if (!ponto.getAtivo()) {
            throw new RegraNegocioException("Ponto de leitura " + ponto.getCodigo() + " está inativo.");
        }
        String id = req.identificador().trim();
        Veiculo veiculo = veiculoRepository.findByChassiIgnoreCase(id)
                .or(() -> veiculoRepository.findByTagRfidIgnoreCase(id))
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Nenhum veículo com chassi ou tag RFID '" + id + "'."));

        MetodoIdentificacao metodo = ponto.getTipo() == TipoPontoLeitura.MANUAL
                ? MetodoIdentificacao.MANUAL : MetodoIdentificacao.AUTOMATICA;
        return registrar(veiculo, ponto.getArea(), ponto, metodo, req.dataHora(), null, null);
    }

    /** Apontamento manual feito por operador (contingência ou áreas sem leitor). */
    @Transactional
    public LeituraResponse registrarManual(MovimentacaoManualRequest req) {
        Veiculo veiculo = obterVeiculo(req.chassi());
        Area area = areaService.obter(req.areaId());
        PontoLeitura estacao = pontoLeituraRepository
                .findFirstByAreaIdAndTipoAndAtivoTrue(area.getId(), TipoPontoLeitura.MANUAL).orElse(null);
        return registrar(veiculo, area, estacao, MetodoIdentificacao.MANUAL, req.dataHora(),
                req.operador(), req.observacao());
    }

    /** Usado no cadastro do veículo quando a área inicial é informada. */
    @Transactional
    public void registrarEntradaInicial(Veiculo veiculo, Area area, String operador) {
        registrar(veiculo, area, null, MetodoIdentificacao.MANUAL, null, operador, "Cadastro do veículo");
    }

    /** Encerra o rastreamento: veículo saiu do polo. Exige que esteja na última área do fluxo. */
    @Transactional
    public MovimentacaoResponse expedir(String chassi, ExpedicaoRequest req) {
        Veiculo veiculo = travar(obterVeiculo(chassi));
        if (veiculo.getStatus() == StatusVeiculo.EXPEDIDO) {
            throw new ConflitoException("Veículo " + veiculo.getChassi() + " já foi expedido.");
        }
        Movimentacao aberta = movimentacaoRepository.findFirstByVeiculoIdAndSaidaEmIsNull(veiculo.getId())
                .orElseThrow(() -> new RegraNegocioException("Veículo não possui movimentação em aberto."));

        Area ultimaArea = areaRepository.findByAtivaTrueOrderByOrdemFluxoAsc().stream()
                .max(Comparator.comparing(Area::getOrdemFluxo)).orElseThrow();
        if (!aberta.getArea().getId().equals(ultimaArea.getId())) {
            throw new RegraNegocioException("Veículo está em " + aberta.getArea().getNome()
                    + "; só pode ser expedido a partir de " + ultimaArea.getNome() + ".");
        }

        Instant quando = validarHorario(req == null ? null : req.dataHora(), aberta);
        aberta.setSaidaEm(quando);
        if (req != null && req.operador() != null) {
            aberta.setObservacao("Expedido por " + req.operador());
        }
        veiculo.setStatus(StatusVeiculo.EXPEDIDO);
        veiculo.setAreaAtual(null);
        veiculo.setUltimaMovimentacaoEm(quando);

        eventos.publishEvent(new EventoMovimentacao("EXPEDICAO", veiculo.getChassi(), veiculo.getModelo(),
                aberta.getArea().getCodigo(), null, MetodoIdentificacao.MANUAL.name(), quando));
        return MovimentacaoResponse.de(aberta);
    }

    @Transactional(readOnly = true)
    public PageResponse<MovimentacaoResponse> listar(String chassi, Long areaId, MetodoIdentificacao metodo,
                                                     Instant inicio, Instant fim, boolean somenteEmAndamento,
                                                     Pageable pageable) {
        Specification<Movimentacao> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (chassi != null && !chassi.isBlank()) {
                p.add(cb.like(cb.upper(root.get("veiculo").get("chassi")), "%" + chassi.trim().toUpperCase() + "%"));
            }
            if (areaId != null) p.add(cb.equal(root.get("area").get("id"), areaId));
            if (metodo != null) p.add(cb.equal(root.get("metodo"), metodo));
            if (inicio != null) p.add(cb.greaterThanOrEqualTo(root.get("entradaEm"), inicio));
            if (fim != null) p.add(cb.lessThan(root.get("entradaEm"), fim));
            if (somenteEmAndamento) p.add(cb.isNull(root.get("saidaEm")));
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.de(movimentacaoRepository.findAll(spec, pageable), MovimentacaoResponse::de);
    }

    // ------------------------------------------------------------------

    private LeituraResponse registrar(Veiculo v, Area area, PontoLeitura ponto, MetodoIdentificacao metodo,
                                      Instant dataHora, String operador, String observacao) {
        Veiculo veiculo = travar(v);
        if (veiculo.getStatus() == StatusVeiculo.EXPEDIDO) {
            throw new ConflitoException("Veículo " + veiculo.getChassi() + " já foi expedido.");
        }
        if (!area.getAtiva()) {
            throw new RegraNegocioException("Área " + area.getNome() + " está inativa.");
        }

        Optional<Movimentacao> abertaOpt = movimentacaoRepository.findFirstByVeiculoIdAndSaidaEmIsNull(veiculo.getId());
        if (abertaOpt.isPresent() && abertaOpt.get().getArea().getId().equals(area.getId())) {
            return new LeituraResponse(false, "Veículo já está em " + area.getNome() + "; leitura ignorada.",
                    MovimentacaoResponse.de(abertaOpt.get()));
        }

        Instant quando = validarHorario(dataHora, abertaOpt.orElse(null));
        String origem = null;
        if (abertaOpt.isPresent()) {
            Movimentacao aberta = abertaOpt.get();
            origem = aberta.getArea().getCodigo();
            aberta.setSaidaEm(quando);
            // flush antes do insert: o índice único parcial permite só uma movimentação aberta por veículo
            movimentacaoRepository.saveAndFlush(aberta);
        }

        Movimentacao nova = new Movimentacao();
        nova.setVeiculo(veiculo);
        nova.setArea(area);
        nova.setPontoLeitura(ponto);
        nova.setMetodo(metodo);
        nova.setEntradaEm(quando);
        nova.setOperador(operador);
        nova.setObservacao(observacao);
        movimentacaoRepository.save(nova);

        veiculo.setAreaAtual(area);
        veiculo.setUltimaMovimentacaoEm(quando);

        eventos.publishEvent(new EventoMovimentacao("MOVIMENTACAO", veiculo.getChassi(), veiculo.getModelo(),
                origem, area.getCodigo(), metodo.name(), quando));
        return new LeituraResponse(true, "Movimentação registrada em " + area.getNome() + ".",
                MovimentacaoResponse.de(nova));
    }

    private Instant validarHorario(Instant dataHora, Movimentacao aberta) {
        Instant agora = Instant.now();
        Instant quando = dataHora != null ? dataHora : agora;
        if (quando.isAfter(agora.plus(TOLERANCIA_RELOGIO))) {
            throw new RegraNegocioException("Data/hora da leitura está no futuro.");
        }
        if (aberta != null && quando.isBefore(aberta.getEntradaEm())) {
            throw new RegraNegocioException("Data/hora anterior à última movimentação do veículo ("
                    + aberta.getEntradaEm() + ").");
        }
        return quando;
    }

    private Veiculo obterVeiculo(String chassi) {
        return veiculoRepository.findByChassiIgnoreCase(chassi.trim())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo com chassi " + chassi + " não encontrado."));
    }

    private Veiculo travar(Veiculo v) {
        return veiculoRepository.findByIdForUpdate(v.getId()).orElseThrow();
    }
}

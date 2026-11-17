package br.com.tracecar.service;

import br.com.tracecar.domain.*;
import br.com.tracecar.repository.MovimentacaoRepository;
import br.com.tracecar.repository.VeiculoRepository;
import br.com.tracecar.web.dto.MovimentacaoDtos.MovimentacaoResponse;
import br.com.tracecar.web.dto.PageResponse;
import br.com.tracecar.web.dto.VeiculoDtos.HistoricoVeiculoResponse;
import br.com.tracecar.web.dto.VeiculoDtos.VeiculoRequest;
import br.com.tracecar.web.dto.VeiculoDtos.VeiculoResponse;
import br.com.tracecar.web.exception.ConflitoException;
import br.com.tracecar.web.exception.RecursoNaoEncontradoException;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final MovimentacaoRepository movimentacaoRepository;
    private final MovimentacaoService movimentacaoService;
    private final AreaService areaService;

    public VeiculoService(VeiculoRepository veiculoRepository, MovimentacaoRepository movimentacaoRepository,
                          MovimentacaoService movimentacaoService, AreaService areaService) {
        this.veiculoRepository = veiculoRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.movimentacaoService = movimentacaoService;
        this.areaService = areaService;
    }

    @Transactional(readOnly = true)
    public PageResponse<VeiculoResponse> listar(String chassi, String modelo, Long areaId, StatusVeiculo status,
                                                Pageable pageable) {
        Specification<Veiculo> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (chassi != null && !chassi.isBlank()) {
                p.add(cb.like(cb.upper(root.get("chassi")), "%" + chassi.trim().toUpperCase() + "%"));
            }
            if (modelo != null && !modelo.isBlank()) {
                p.add(cb.equal(cb.upper(root.get("modelo")), modelo.trim().toUpperCase()));
            }
            if (areaId != null) p.add(cb.equal(root.get("areaAtual").get("id"), areaId));
            if (status != null) p.add(cb.equal(root.get("status"), status));
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageResponse.de(veiculoRepository.findAll(spec, pageable), VeiculoResponse::de);
    }

    @Transactional(readOnly = true)
    public List<VeiculoResponse> buscarPorTrecho(String termo, int limite) {
        return veiculoRepository.buscarPorTrechoDoChassi(termo.trim(), PageRequest.of(0, Math.min(limite, 50)))
                .stream().map(VeiculoResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public VeiculoResponse buscarPorChassi(String chassi) {
        return VeiculoResponse.de(obter(chassi));
    }

    @Transactional(readOnly = true)
    public HistoricoVeiculoResponse historico(String chassi) {
        Veiculo v = obter(chassi);
        List<Movimentacao> movs = movimentacaoRepository.findByVeiculoIdOrderByEntradaEmAsc(v.getId());
        List<MovimentacaoResponse> itens = movs.stream().map(MovimentacaoResponse::de).toList();

        Long tempoTotal = null;
        if (!movs.isEmpty()) {
            Instant inicio = movs.getFirst().getEntradaEm();
            Instant fim = v.getStatus() == StatusVeiculo.EXPEDIDO ? v.getUltimaMovimentacaoEm() : Instant.now();
            tempoTotal = Duration.between(inicio, fim).toMinutes();
        }
        int automaticas = (int) movs.stream().filter(m -> m.getMetodo() == MetodoIdentificacao.AUTOMATICA).count();
        int areas = (int) movs.stream().map(m -> m.getArea().getId()).distinct().count();
        return new HistoricoVeiculoResponse(VeiculoResponse.de(v), itens, tempoTotal, areas,
                automaticas, movs.size() - automaticas);
    }

    @Transactional
    public VeiculoResponse criar(VeiculoRequest req) {
        String chassi = req.chassi().trim().toUpperCase();
        if (veiculoRepository.existsByChassiIgnoreCase(chassi)) {
            throw new ConflitoException("Veículo com chassi " + chassi + " já cadastrado.");
        }
        String tag = req.tagRfid() == null || req.tagRfid().isBlank() ? null : req.tagRfid().trim().toUpperCase();
        if (tag != null && veiculoRepository.existsByTagRfidIgnoreCase(tag)) {
            throw new ConflitoException("Tag RFID " + tag + " já associada a outro veículo.");
        }

        Veiculo v = new Veiculo();
        v.setChassi(chassi);
        v.setTagRfid(tag);
        v.setMarca(req.marca().trim());
        v.setModelo(req.modelo().trim());
        v.setVersao(req.versao());
        v.setCor(req.cor());
        v.setAnoModelo(req.anoModelo());
        veiculoRepository.saveAndFlush(v);

        if (req.areaInicialId() != null) {
            Area area = areaService.obter(req.areaInicialId());
            movimentacaoService.registrarEntradaInicial(v, area, req.operador());
        }
        return VeiculoResponse.de(v);
    }

    private Veiculo obter(String chassi) {
        return veiculoRepository.findByChassiIgnoreCase(chassi.trim())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo com chassi " + chassi + " não encontrado."));
    }
}

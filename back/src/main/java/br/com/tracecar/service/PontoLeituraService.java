package br.com.tracecar.service;

import br.com.tracecar.domain.PontoLeitura;
import br.com.tracecar.repository.PontoLeituraRepository;
import br.com.tracecar.web.dto.PontoLeituraDtos.PontoLeituraRequest;
import br.com.tracecar.web.dto.PontoLeituraDtos.PontoLeituraResponse;
import br.com.tracecar.web.exception.ConflitoException;
import br.com.tracecar.web.exception.RecursoNaoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PontoLeituraService {

    private final PontoLeituraRepository repository;
    private final AreaService areaService;

    public PontoLeituraService(PontoLeituraRepository repository, AreaService areaService) {
        this.repository = repository;
        this.areaService = areaService;
    }

    @Transactional(readOnly = true)
    public List<PontoLeituraResponse> listar(Long areaId) {
        List<PontoLeitura> pontos = areaId == null
                ? repository.findAllByOrderByCodigoAsc()
                : repository.findByAreaIdOrderByCodigoAsc(areaId);
        return pontos.stream().map(PontoLeituraResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public PontoLeituraResponse buscar(Long id) {
        return PontoLeituraResponse.de(obter(id));
    }

    @Transactional
    public PontoLeituraResponse criar(PontoLeituraRequest req) {
        String codigo = req.codigo().trim().toUpperCase();
        if (repository.existsByCodigoIgnoreCase(codigo)) {
            throw new ConflitoException("Já existe ponto de leitura com o código " + codigo + ".");
        }
        PontoLeitura p = new PontoLeitura();
        p.setCodigo(codigo);
        aplicar(p, req);
        return PontoLeituraResponse.de(repository.save(p));
    }

    @Transactional
    public PontoLeituraResponse atualizar(Long id, PontoLeituraRequest req) {
        PontoLeitura p = obter(id);
        String codigo = req.codigo().trim().toUpperCase();
        if (!p.getCodigo().equalsIgnoreCase(codigo) && repository.existsByCodigoIgnoreCase(codigo)) {
            throw new ConflitoException("Já existe ponto de leitura com o código " + codigo + ".");
        }
        p.setCodigo(codigo);
        aplicar(p, req);
        return PontoLeituraResponse.de(p);
    }

    PontoLeitura obterPorCodigo(String codigo) {
        return repository.findByCodigoIgnoreCase(codigo.trim())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ponto de leitura " + codigo + " não encontrado."));
    }

    private PontoLeitura obter(Long id) {
        return repository.findWithAreaById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ponto de leitura " + id + " não encontrado."));
    }

    private void aplicar(PontoLeitura p, PontoLeituraRequest req) {
        p.setDescricao(req.descricao());
        p.setTipo(req.tipo());
        p.setArea(areaService.obter(req.areaId()));
        p.setAtivo(req.ativo() == null || req.ativo());
    }
}

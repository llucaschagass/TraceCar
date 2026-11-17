package br.com.tracecar.service;

import br.com.tracecar.domain.Area;
import br.com.tracecar.repository.AreaRepository;
import br.com.tracecar.web.dto.AreaDtos.AreaRequest;
import br.com.tracecar.web.dto.AreaDtos.AreaResponse;
import br.com.tracecar.web.exception.ConflitoException;
import br.com.tracecar.web.exception.RecursoNaoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AreaService {

    private final AreaRepository repository;

    public AreaService(AreaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<AreaResponse> listar(boolean somenteAtivas) {
        List<Area> areas = somenteAtivas
                ? repository.findByAtivaTrueOrderByOrdemFluxoAsc()
                : repository.findAllByOrderByOrdemFluxoAsc();
        return areas.stream().map(AreaResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public AreaResponse buscar(Long id) {
        return AreaResponse.de(obter(id));
    }

    @Transactional
    public AreaResponse criar(AreaRequest req) {
        String codigo = req.codigo().trim().toUpperCase();
        if (repository.existsByCodigoIgnoreCase(codigo)) {
            throw new ConflitoException("Já existe área com o código " + codigo + ".");
        }
        Area area = new Area();
        area.setCodigo(codigo);
        aplicar(area, req);
        return AreaResponse.de(repository.save(area));
    }

    @Transactional
    public AreaResponse atualizar(Long id, AreaRequest req) {
        Area area = obter(id);
        String codigo = req.codigo().trim().toUpperCase();
        if (!area.getCodigo().equalsIgnoreCase(codigo) && repository.existsByCodigoIgnoreCase(codigo)) {
            throw new ConflitoException("Já existe área com o código " + codigo + ".");
        }
        area.setCodigo(codigo);
        aplicar(area, req);
        return AreaResponse.de(area);
    }

    Area obter(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Área " + id + " não encontrada."));
    }

    private void aplicar(Area area, AreaRequest req) {
        area.setNome(req.nome().trim());
        area.setDescricao(req.descricao());
        area.setCapacidade(req.capacidade());
        area.setOrdemFluxo(req.ordemFluxo());
        area.setPosX(req.posX() != null ? req.posX() : 0);
        area.setPosY(req.posY() != null ? req.posY() : 0);
        area.setAtiva(req.ativa() == null || req.ativa());
    }
}

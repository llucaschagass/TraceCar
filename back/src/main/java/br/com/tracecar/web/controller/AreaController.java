package br.com.tracecar.web.controller;

import br.com.tracecar.service.AreaService;
import br.com.tracecar.web.dto.AreaDtos.AreaRequest;
import br.com.tracecar.web.dto.AreaDtos.AreaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/areas")
@Tag(name = "Áreas")
public class AreaController {

    private final AreaService service;

    public AreaController(AreaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista as áreas na ordem do fluxo produtivo")
    public List<AreaResponse> listar(@RequestParam(defaultValue = "false") boolean somenteAtivas) {
        return service.listar(somenteAtivas);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalha uma área")
    public AreaResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastra uma área")
    public AreaResponse criar(@Valid @RequestBody AreaRequest req) {
        return service.criar(req);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza uma área (use ativa=false para desativar)")
    public AreaResponse atualizar(@PathVariable Long id, @Valid @RequestBody AreaRequest req) {
        return service.atualizar(id, req);
    }
}

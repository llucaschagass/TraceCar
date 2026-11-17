package br.com.tracecar.web.controller;

import br.com.tracecar.service.PontoLeituraService;
import br.com.tracecar.web.dto.PontoLeituraDtos.PontoLeituraRequest;
import br.com.tracecar.web.dto.PontoLeituraDtos.PontoLeituraResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pontos-leitura")
@Tag(name = "Pontos de leitura")
public class PontoLeituraController {

    private final PontoLeituraService service;

    public PontoLeituraController(PontoLeituraService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista pontos de leitura (opcionalmente de uma área)")
    public List<PontoLeituraResponse> listar(@RequestParam(required = false) Long areaId) {
        return service.listar(areaId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalha um ponto de leitura")
    public PontoLeituraResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastra um ponto de leitura")
    public PontoLeituraResponse criar(@Valid @RequestBody PontoLeituraRequest req) {
        return service.criar(req);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza um ponto de leitura")
    public PontoLeituraResponse atualizar(@PathVariable Long id, @Valid @RequestBody PontoLeituraRequest req) {
        return service.atualizar(id, req);
    }
}

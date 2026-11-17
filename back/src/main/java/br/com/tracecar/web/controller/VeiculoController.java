package br.com.tracecar.web.controller;

import br.com.tracecar.domain.StatusVeiculo;
import br.com.tracecar.service.MovimentacaoService;
import br.com.tracecar.service.VeiculoService;
import br.com.tracecar.web.dto.MovimentacaoDtos.ExpedicaoRequest;
import br.com.tracecar.web.dto.MovimentacaoDtos.MovimentacaoResponse;
import br.com.tracecar.web.dto.PageResponse;
import br.com.tracecar.web.dto.VeiculoDtos.HistoricoVeiculoResponse;
import br.com.tracecar.web.dto.VeiculoDtos.VeiculoRequest;
import br.com.tracecar.web.dto.VeiculoDtos.VeiculoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veiculos")
@Tag(name = "Veículos")
@Validated
public class VeiculoController {

    private final VeiculoService service;
    private final MovimentacaoService movimentacaoService;

    public VeiculoController(VeiculoService service, MovimentacaoService movimentacaoService) {
        this.service = service;
        this.movimentacaoService = movimentacaoService;
    }

    @GetMapping
    @Operation(summary = "Lista veículos com filtros e paginação")
    public PageResponse<VeiculoResponse> listar(
            @Parameter(description = "Trecho do chassi") @RequestParam(required = false) String chassi,
            @RequestParam(required = false) String modelo,
            @Parameter(description = "Área atual") @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) StatusVeiculo status,
            @ParameterObject @PageableDefault(size = 20, sort = "ultimaMovimentacaoEm", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.listar(chassi, modelo, areaId, status, pageable);
    }

    @GetMapping("/busca")
    @Operation(summary = "Busca rápida por trecho do chassi (autocomplete)",
            description = "Aceita o chassi completo ou parte dele, como os últimos 6-8 caracteres usados no chão de fábrica.")
    public List<VeiculoResponse> buscar(
            @RequestParam @Size(min = 3, message = "informe ao menos 3 caracteres") String termo,
            @RequestParam(defaultValue = "10") int limite) {
        return service.buscarPorTrecho(termo, limite);
    }

    @GetMapping("/{chassi}")
    @Operation(summary = "Consulta por chassi: dados e localização atual")
    public VeiculoResponse porChassi(@PathVariable String chassi) {
        return service.buscarPorChassi(chassi);
    }

    @GetMapping("/{chassi}/historico")
    @Operation(summary = "Histórico de movimentação do veículo (linha do tempo por área)")
    public HistoricoVeiculoResponse historico(@PathVariable String chassi) {
        return service.historico(chassi);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastra um veículo (opcionalmente já registrando a área inicial)")
    public VeiculoResponse criar(@Valid @RequestBody VeiculoRequest req) {
        return service.criar(req);
    }

    @PostMapping("/{chassi}/expedicao")
    @Operation(summary = "Registra a expedição do veículo (saída do polo)",
            description = "Encerra a permanência na última área do fluxo e marca o veículo como EXPEDIDO.")
    public MovimentacaoResponse expedir(@PathVariable String chassi,
                                        @Valid @RequestBody(required = false) ExpedicaoRequest req) {
        return movimentacaoService.expedir(chassi, req);
    }
}

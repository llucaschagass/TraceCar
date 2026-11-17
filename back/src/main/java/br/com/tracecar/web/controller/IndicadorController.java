package br.com.tracecar.web.controller;

import br.com.tracecar.service.IndicadorService;
import br.com.tracecar.service.IndicadorService.Periodo;
import br.com.tracecar.web.dto.IndicadorDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/indicadores")
@Tag(name = "Indicadores")
public class IndicadorController {

    private static final String DESC_PERIODO =
            "Período em ISO-8601 (ex.: 2026-11-16T00:00:00-03:00). Padrão: últimas 24h. Máximo: 93 dias.";

    private final IndicadorService service;

    public IndicadorController(IndicadorService service) {
        this.service = service;
    }

    @GetMapping("/resumo")
    @Operation(summary = "KPIs gerais: veículos em circulação, expedidos, % identificação automática, tempo de ciclo",
            description = DESC_PERIODO)
    public ResumoResponse resumo(
            @Parameter(description = "Início") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime inicio,
            @Parameter(description = "Fim") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fim) {
        return service.resumo(periodo(inicio, fim));
    }

    @GetMapping("/fluxo")
    @Operation(summary = "Fluxo: entradas/saídas por área, transições entre áreas e série horária",
            description = DESC_PERIODO)
    public IndicadorFluxoResponse fluxo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fim) {
        return service.fluxo(periodo(inicio, fim));
    }

    @GetMapping("/permanencia")
    @Operation(summary = "Permanência: tempo médio, mínimo, máximo, mediana e P90 por área",
            description = DESC_PERIODO)
    public IndicadorPermanenciaResponse permanencia(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fim) {
        return service.permanencia(periodo(inicio, fim));
    }

    @GetMapping("/utilizacao")
    @Operation(summary = "Utilização: ocupação atual e média de cada área vs. capacidade",
            description = DESC_PERIODO)
    public IndicadorUtilizacaoResponse utilizacao(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fim) {
        return service.utilizacao(periodo(inicio, fim));
    }

    private Periodo periodo(OffsetDateTime inicio, OffsetDateTime fim) {
        return service.periodo(inicio == null ? null : inicio.toInstant(), fim == null ? null : fim.toInstant());
    }
}

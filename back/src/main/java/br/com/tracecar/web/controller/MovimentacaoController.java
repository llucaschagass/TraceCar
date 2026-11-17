package br.com.tracecar.web.controller;

import br.com.tracecar.domain.MetodoIdentificacao;
import br.com.tracecar.service.MovimentacaoService;
import br.com.tracecar.web.dto.MovimentacaoDtos.MovimentacaoResponse;
import br.com.tracecar.web.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/movimentacoes")
@Tag(name = "Movimentações")
public class MovimentacaoController {

    private final MovimentacaoService service;

    public MovimentacaoController(MovimentacaoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista o registro de movimentações com filtros",
            description = "Filtra pela data de entrada na área. Datas em ISO-8601, ex.: 2026-11-17T08:00:00-03:00")
    public PageResponse<MovimentacaoResponse> listar(
            @Parameter(description = "Trecho do chassi") @RequestParam(required = false) String chassi,
            @RequestParam(required = false) Long areaId,
            @RequestParam(required = false) MetodoIdentificacao metodo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fim,
            @Parameter(description = "Somente permanências em aberto (veículos ainda na área)")
            @RequestParam(defaultValue = "false") boolean emAndamento,
            @ParameterObject @PageableDefault(size = 20, sort = "entradaEm", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.listar(chassi, areaId, metodo,
                inicio == null ? null : inicio.toInstant(),
                fim == null ? null : fim.toInstant(),
                emAndamento, pageable);
    }
}

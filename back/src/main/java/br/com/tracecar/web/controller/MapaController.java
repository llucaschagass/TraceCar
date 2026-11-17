package br.com.tracecar.web.controller;

import br.com.tracecar.service.MapaService;
import br.com.tracecar.service.TempoRealService;
import br.com.tracecar.web.dto.MapaDtos.MapaAreaResponse;
import br.com.tracecar.web.dto.MapaDtos.MapaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/mapa")
@Tag(name = "Mapa")
public class MapaController {

    private final MapaService mapaService;
    private final TempoRealService tempoRealService;

    public MapaController(MapaService mapaService, TempoRealService tempoRealService) {
        this.mapaService = mapaService;
        this.tempoRealService = tempoRealService;
    }

    @GetMapping
    @Operation(summary = "Mapa em tempo real: ocupação de cada área e veículos presentes")
    public MapaResponse mapa(@RequestParam(defaultValue = "true") boolean incluirVeiculos) {
        return mapaService.mapa(incluirVeiculos);
    }

    @GetMapping("/areas/{areaId}")
    @Operation(summary = "Veículos presentes em uma área agora")
    public MapaAreaResponse area(@PathVariable Long areaId) {
        return mapaService.area(areaId);
    }

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream SSE de movimentações em tempo real",
            description = "Eventos: 'conectado', 'movimentacao' (JSON EventoMovimentacao) e 'heartbeat'. "
                    + "No front: new EventSource('/api/mapa/stream'). Não é testável pelo Swagger UI.")
    public SseEmitter stream() {
        return tempoRealService.conectar();
    }
}

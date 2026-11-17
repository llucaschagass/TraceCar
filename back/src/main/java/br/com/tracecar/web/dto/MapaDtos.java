package br.com.tracecar.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

public final class MapaDtos {

    private MapaDtos() {
    }

    public enum SituacaoOcupacao { NORMAL, ATENCAO, CRITICA }

    @Schema(name = "MapaResponse", description = "Mapa em tempo real do giro industrial")
    public record MapaResponse(Instant geradoEm, long totalEmCirculacao, List<MapaAreaResponse> areas) {
    }

    @Schema(name = "MapaAreaResponse")
    public record MapaAreaResponse(Long id, String codigo, String nome, Integer ordemFluxo, Integer posX, Integer posY,
                                   Integer capacidade, long ocupacao, double percentualOcupacao,
                                   @Schema(description = "NORMAL < 70%, ATENCAO < 90%, CRITICA >= 90%") SituacaoOcupacao situacao,
                                   Long permanenciaMediaAtualMinutos,
                                   List<VeiculoNaAreaResponse> veiculos) {
    }

    @Schema(name = "VeiculoNaAreaResponse")
    public record VeiculoNaAreaResponse(String chassi, String modelo, String versao, String cor,
                                        Instant desde, long minutosNaArea) {
    }

    @Schema(name = "EventoMovimentacao", description = "Evento enviado via SSE a cada movimentação")
    public record EventoMovimentacao(String tipo, String chassi, String modelo, String areaOrigem,
                                     String areaDestino, String metodo, Instant dataHora) {
    }
}

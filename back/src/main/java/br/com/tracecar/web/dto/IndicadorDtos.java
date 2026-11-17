package br.com.tracecar.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

public final class IndicadorDtos {

    private IndicadorDtos() {
    }

    // ---------- Fluxo ----------
    @Schema(name = "IndicadorFluxoResponse", description = "Entradas/saídas por área, transições entre áreas e série por hora")
    public record IndicadorFluxoResponse(Instant inicio, Instant fim, List<FluxoArea> porArea,
                                         List<FluxoTransicao> transicoes, List<FluxoHora> porHora) {
    }

    @Schema(name = "FluxoArea")
    public record FluxoArea(Long areaId, String codigo, String nome, long entradas, long saidas,
                            @Schema(description = "Saídas por hora no período") double vazaoPorHora) {
    }

    @Schema(name = "FluxoTransicao")
    public record FluxoTransicao(String origem, String origemNome, String destino, String destinoNome, long quantidade) {
    }

    @Schema(name = "FluxoHora")
    public record FluxoHora(Instant hora, long entradas, long saidas) {
    }

    // ---------- Permanencia ----------
    @Schema(name = "IndicadorPermanenciaResponse", description = "Tempo de permanência (min) das passagens encerradas no período")
    public record IndicadorPermanenciaResponse(Instant inicio, Instant fim, List<PermanenciaArea> areas) {
    }

    @Schema(name = "PermanenciaArea")
    public record PermanenciaArea(Long areaId, String codigo, String nome, long passagens,
                                  Double mediaMinutos, Double minimoMinutos, Double maximoMinutos,
                                  Double medianaMinutos, Double p90Minutos,
                                  @Schema(description = "Média de tempo dos veículos que estão na área agora") Double mediaAtualMinutos) {
    }

    // ---------- Utilizacao ----------
    @Schema(name = "IndicadorUtilizacaoResponse", description = "Ocupação média e atual de cada área em relação à capacidade")
    public record IndicadorUtilizacaoResponse(Instant inicio, Instant fim, List<UtilizacaoArea> areas) {
    }

    @Schema(name = "UtilizacaoArea")
    public record UtilizacaoArea(Long areaId, String codigo, String nome, int capacidade,
                                 long ocupacaoAtual, double percentualAtual,
                                 double ocupacaoMedia, double percentualMedio) {
    }

    // ---------- Resumo ----------
    @Schema(name = "ResumoResponse", description = "KPIs gerais para o painel")
    public record ResumoResponse(Instant inicio, Instant fim, long totalVeiculos, long emCirculacao,
                                 long expedidosNoPeriodo, long movimentacoesNoPeriodo,
                                 double percentualIdentificacaoAutomatica,
                                 Double tempoMedioCicloMinutos,
                                 List<MaiorPermanencia> maioresPermanenciasAtuais) {
    }

    @Schema(name = "MaiorPermanencia", description = "Veículos parados há mais tempo na área atual")
    public record MaiorPermanencia(String chassi, String modelo, String area, Instant desde, long minutos) {
    }
}

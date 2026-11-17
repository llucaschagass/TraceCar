package br.com.tracecar.web.dto;

import br.com.tracecar.domain.StatusVeiculo;
import br.com.tracecar.domain.Veiculo;
import br.com.tracecar.web.dto.AreaDtos.AreaResumo;
import br.com.tracecar.web.dto.MovimentacaoDtos.MovimentacaoResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

public final class VeiculoDtos {

    public static final String REGEX_CHASSI = "^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$";

    private VeiculoDtos() {
    }

    @Schema(name = "VeiculoRequest", description = "Cadastro de veículo. Se areaInicialId for informado, já registra a primeira movimentação.")
    public record VeiculoRequest(
            @Schema(example = "9BD281A2XVB300001", description = "VIN com 17 caracteres (sem I, O, Q)")
            @NotBlank @Pattern(regexp = REGEX_CHASSI, message = "chassi deve ter 17 caracteres alfanuméricos (sem I, O, Q)") String chassi,
            @Schema(example = "E2806894000A1B2C") @Size(max = 40) String tagRfid,
            @Schema(example = "Fiat") @NotBlank @Size(max = 40) String marca,
            @Schema(example = "Strada") @NotBlank @Size(max = 60) String modelo,
            @Schema(example = "Volcano") @Size(max = 60) String versao,
            @Schema(example = "Branco Banchisa") @Size(max = 40) String cor,
            @Schema(example = "2027") @Min(1990) @Max(2100) Integer anoModelo,
            @Schema(description = "Área onde o veículo é identificado pela primeira vez (ex.: Montagem)") Long areaInicialId,
            @Schema(example = "Operador 01") @Size(max = 80) String operador) {
    }

    @Schema(name = "VeiculoResponse")
    public record VeiculoResponse(Long id, String chassi, String tagRfid, String marca, String modelo, String versao,
                                  String cor, Integer anoModelo, StatusVeiculo status, AreaResumo areaAtual,
                                  Instant ultimaMovimentacaoEm,
                                  @Schema(description = "Minutos na área atual (nulo se expedido)") Long minutosNaAreaAtual) {
        public static VeiculoResponse de(Veiculo v) {
            Long minutos = (v.getAreaAtual() != null && v.getUltimaMovimentacaoEm() != null)
                    ? Duration.between(v.getUltimaMovimentacaoEm(), Instant.now()).toMinutes()
                    : null;
            return new VeiculoResponse(v.getId(), v.getChassi(), v.getTagRfid(), v.getMarca(), v.getModelo(),
                    v.getVersao(), v.getCor(), v.getAnoModelo(), v.getStatus(), AreaResumo.de(v.getAreaAtual()),
                    v.getUltimaMovimentacaoEm(), minutos);
        }
    }

    @Schema(name = "HistoricoVeiculoResponse", description = "Consulta por chassi: dados do veículo e linha do tempo de movimentações")
    public record HistoricoVeiculoResponse(
            VeiculoResponse veiculo,
            List<MovimentacaoResponse> movimentacoes,
            @Schema(description = "Da primeira leitura até a expedição (ou agora)") Long tempoTotalMinutos,
            Integer quantidadeAreas,
            Integer leiturasAutomaticas,
            Integer leiturasManuais) {
    }
}

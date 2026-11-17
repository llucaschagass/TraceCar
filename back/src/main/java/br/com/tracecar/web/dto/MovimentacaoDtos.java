package br.com.tracecar.web.dto;

import br.com.tracecar.domain.MetodoIdentificacao;
import br.com.tracecar.domain.Movimentacao;
import br.com.tracecar.domain.PontoLeitura;
import br.com.tracecar.domain.TipoPontoLeitura;
import br.com.tracecar.web.dto.AreaDtos.AreaResumo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class MovimentacaoDtos {

    private MovimentacaoDtos() {
    }

    @Schema(name = "LeituraRequest", description = "Evento enviado por um dispositivo de identificação automática (RFID, OCR, QR)")
    public record LeituraRequest(
            @Schema(example = "TES-RFID-01") @NotBlank String codigoPontoLeitura,
            @Schema(example = "9BD281A2XVB300001", description = "Chassi (VIN) ou código da tag RFID")
            @NotBlank @Size(max = 40) String identificador,
            @Schema(description = "Momento da leitura. Se omitido, usa o horário do servidor.") Instant dataHora) {
    }

    @Schema(name = "MovimentacaoManualRequest", description = "Apontamento manual de movimentação feito por operador")
    public record MovimentacaoManualRequest(
            @Schema(example = "9BD281A2XVB300001") @NotBlank @Pattern(regexp = VeiculoDtos.REGEX_CHASSI, message = "chassi inválido") String chassi,
            @NotNull Long areaId,
            @Schema(example = "Operador 01") @NotBlank @Size(max = 80) String operador,
            @Size(max = 255) String observacao,
            Instant dataHora) {
    }

    @Schema(name = "ExpedicaoRequest")
    public record ExpedicaoRequest(
            @Schema(example = "Operador 03") @Size(max = 80) String operador,
            Instant dataHora) {
    }

    @Schema(name = "MovimentacaoResponse", description = "Permanência de um veículo em uma área")
    public record MovimentacaoResponse(Long id, String chassi, String modelo, AreaResumo area,
                                       String pontoLeitura, TipoPontoLeitura tipoPontoLeitura,
                                       MetodoIdentificacao metodo, Instant entradaEm,
                                       @Schema(description = "Nulo enquanto o veículo estiver na área") Instant saidaEm,
                                       Long duracaoMinutos, Boolean emAndamento, String operador, String observacao) {
        public static MovimentacaoResponse de(Movimentacao m) {
            PontoLeitura p = m.getPontoLeitura();
            return new MovimentacaoResponse(m.getId(), m.getVeiculo().getChassi(), m.getVeiculo().getModelo(),
                    AreaResumo.de(m.getArea()), p == null ? null : p.getCodigo(), p == null ? null : p.getTipo(),
                    m.getMetodo(), m.getEntradaEm(), m.getSaidaEm(), m.duracaoMinutos(), m.getSaidaEm() == null,
                    m.getOperador(), m.getObservacao());
        }
    }

    @Schema(name = "LeituraResponse")
    public record LeituraResponse(
            @Schema(description = "false quando a leitura repete a área atual (leitura duplicada é ignorada)") boolean novaMovimentacao,
            String mensagem,
            MovimentacaoResponse movimentacao) {
    }
}

package br.com.tracecar.web.dto;

import br.com.tracecar.domain.PontoLeitura;
import br.com.tracecar.domain.TipoPontoLeitura;
import br.com.tracecar.web.dto.AreaDtos.AreaResumo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class PontoLeituraDtos {

    private PontoLeituraDtos() {
    }

    @Schema(name = "PontoLeituraRequest", description = "Portal RFID, câmera OCR, leitor QR ou estação manual")
    public record PontoLeituraRequest(
            @Schema(example = "TES-RFID-02") @NotBlank @Size(max = 40) String codigo,
            @Size(max = 255) String descricao,
            @NotNull TipoPontoLeitura tipo,
            @NotNull Long areaId,
            Boolean ativo) {
    }

    @Schema(name = "PontoLeituraResponse")
    public record PontoLeituraResponse(Long id, String codigo, String descricao, TipoPontoLeitura tipo,
                                       AreaResumo area, Boolean ativo) {
        public static PontoLeituraResponse de(PontoLeitura p) {
            return new PontoLeituraResponse(p.getId(), p.getCodigo(), p.getDescricao(), p.getTipo(),
                    AreaResumo.de(p.getArea()), p.getAtivo());
        }
    }
}

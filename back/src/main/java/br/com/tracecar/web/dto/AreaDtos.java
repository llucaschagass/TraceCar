package br.com.tracecar.web.dto;

import br.com.tracecar.domain.Area;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

public final class AreaDtos {

    private AreaDtos() {
    }

    @Schema(name = "AreaRequest", description = "Dados para cadastro/edição de área")
    public record AreaRequest(
            @Schema(example = "PINTURA") @NotBlank @Size(max = 30) @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "use letras, números e _") String codigo,
            @Schema(example = "Pintura") @NotBlank @Size(max = 80) String nome,
            @Size(max = 255) String descricao,
            @Schema(example = "20") @NotNull @Positive Integer capacidade,
            @Schema(example = "7", description = "Ordem da área no fluxo produtivo") @NotNull @PositiveOrZero Integer ordemFluxo,
            @Schema(example = "100", description = "Posição X no mapa conceitual") @PositiveOrZero Integer posX,
            @Schema(example = "500", description = "Posição Y no mapa conceitual") @PositiveOrZero Integer posY,
            Boolean ativa) {
    }

    @Schema(name = "AreaResponse")
    public record AreaResponse(Long id, String codigo, String nome, String descricao, Integer capacidade,
                               Integer ordemFluxo, Integer posX, Integer posY, Boolean ativa) {
        public static AreaResponse de(Area a) {
            return new AreaResponse(a.getId(), a.getCodigo(), a.getNome(), a.getDescricao(), a.getCapacidade(),
                    a.getOrdemFluxo(), a.getPosX(), a.getPosY(), a.getAtiva());
        }
    }

    @Schema(name = "AreaResumo")
    public record AreaResumo(Long id, String codigo, String nome) {
        public static AreaResumo de(Area a) {
            return a == null ? null : new AreaResumo(a.getId(), a.getCodigo(), a.getNome());
        }
    }
}

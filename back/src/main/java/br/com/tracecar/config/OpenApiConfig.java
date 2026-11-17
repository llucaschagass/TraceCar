package br.com.tracecar.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI tracecarOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("TraceCar API")
                        .version("v1")
                        .description("""
                                Rastreamento de veículos no giro industrial — SAGA SENAI × Stellantis.

                                Registra movimentações entre áreas (Montagem, Inspeção, Testes, Retrabalho,
                                Logística interna, Expedição) por identificação automática (RFID / câmera OCR)
                                ou apontamento manual, permitindo consulta por chassi, mapa em tempo real
                                e indicadores de fluxo, permanência e utilização das áreas.
                                """)
                        .contact(new Contact().name("Equipe TraceCar")))
                .tags(List.of(
                        new Tag().name("Leituras").description("Entrada de eventos dos dispositivos de identificação e apontamentos manuais"),
                        new Tag().name("Veículos").description("Cadastro e consulta por chassi com histórico de movimentação"),
                        new Tag().name("Movimentações").description("Registro (log) de movimentações"),
                        new Tag().name("Mapa").description("Ocupação das áreas em tempo real"),
                        new Tag().name("Indicadores").description("Fluxo, permanência e utilização das áreas"),
                        new Tag().name("Áreas").description("Áreas físicas do polo"),
                        new Tag().name("Pontos de leitura").description("Portais RFID, câmeras OCR e estações manuais")));
    }
}

package br.com.tracecar.web.controller;

import br.com.tracecar.service.MovimentacaoService;
import br.com.tracecar.web.dto.MovimentacaoDtos.LeituraRequest;
import br.com.tracecar.web.dto.MovimentacaoDtos.LeituraResponse;
import br.com.tracecar.web.dto.MovimentacaoDtos.MovimentacaoManualRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leituras")
@Tag(name = "Leituras")
public class LeituraController {

    private final MovimentacaoService service;

    public LeituraController(MovimentacaoService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Recebe leitura de identificação automática",
            description = """
                    Chamado pelos dispositivos (portal RFID, câmera OCR, leitor QR). O identificador pode ser o chassi \
                    ou a tag RFID. Uma leitura em área diferente da atual encerra a permanência anterior e abre uma nova; \
                    leituras repetidas na mesma área retornam 200 com novaMovimentacao=false.""")
    public ResponseEntity<LeituraResponse> leitura(@Valid @RequestBody LeituraRequest req) {
        return responder(service.registrarLeitura(req));
    }

    @PostMapping("/manual")
    @Operation(summary = "Apontamento manual de movimentação por operador")
    public ResponseEntity<LeituraResponse> manual(@Valid @RequestBody MovimentacaoManualRequest req) {
        return responder(service.registrarManual(req));
    }

    private ResponseEntity<LeituraResponse> responder(LeituraResponse r) {
        return ResponseEntity.status(r.novaMovimentacao() ? HttpStatus.CREATED : HttpStatus.OK).body(r);
    }
}

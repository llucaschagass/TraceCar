package br.com.tracecar.service;

import br.com.tracecar.web.dto.MapaDtos.EventoMovimentacao;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Distribui eventos de movimentação para clientes conectados via Server-Sent Events,
 * permitindo que o mapa do front atualize em tempo real.
 */
@Service
public class TempoRealService {

    private static final Logger log = LoggerFactory.getLogger(TempoRealService.class);
    private static final long TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter conectar() {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        emitters.add(emitter);
        try {
            emitter.send(SseEmitter.event().name("conectado").data("ok"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    /** Publica somente após o commit, para o front nunca ver uma movimentação que sofreu rollback. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void aoRegistrarMovimentacao(EventoMovimentacao evento) {
        enviar("movimentacao", evento);
    }

    /** Mantém conexões vivas atrás de proxies. */
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        enviar("heartbeat", "ping");
    }

    private void enviar(String nome, Object dados) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(nome).data(dados, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                log.debug("Cliente SSE desconectado: {}", e.getMessage());
                emitters.remove(emitter);
            }
        }
    }
}

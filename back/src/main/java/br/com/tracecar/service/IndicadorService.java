package br.com.tracecar.service;

import br.com.tracecar.web.dto.IndicadorDtos.*;
import br.com.tracecar.web.exception.RegraNegocioException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Indicadores de fluxo, permanência e utilização das áreas, calculados direto no
 * PostgreSQL a partir da tabela de movimentações.
 */
@Service
@Transactional(readOnly = true)
public class IndicadorService {

    private static final Duration PERIODO_PADRAO = Duration.ofHours(24);
    private static final Duration PERIODO_MAXIMO = Duration.ofDays(93);

    private final JdbcClient jdbc;

    public IndicadorService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record Periodo(Instant inicio, Instant fim) {
        OffsetDateTime ini() { return inicio.atOffset(ZoneOffset.UTC); }
        OffsetDateTime end() { return fim.atOffset(ZoneOffset.UTC); }
        double horas() { return Duration.between(inicio, fim).toSeconds() / 3600.0; }
    }

    public Periodo periodo(Instant inicio, Instant fim) {
        Instant f = fim != null ? fim : Instant.now();
        Instant i = inicio != null ? inicio : f.minus(PERIODO_PADRAO);
        if (!i.isBefore(f)) throw new RegraNegocioException("'inicio' deve ser anterior a 'fim'.");
        if (Duration.between(i, f).compareTo(PERIODO_MAXIMO) > 0) {
            throw new RegraNegocioException("Período máximo é de 93 dias.");
        }
        return new Periodo(i, f);
    }

    // ------------------------------------------------------------------ fluxo

    public IndicadorFluxoResponse fluxo(Periodo p) {
        List<FluxoArea> porArea = jdbc.sql("""
                        SELECT a.id, a.codigo, a.nome,
                               (SELECT count(*) FROM movimentacao m
                                 WHERE m.area_id = a.id AND m.entrada_em >= :ini AND m.entrada_em < :fim) AS entradas,
                               (SELECT count(*) FROM movimentacao m
                                 WHERE m.area_id = a.id AND m.saida_em >= :ini AND m.saida_em < :fim) AS saidas
                          FROM area a
                         WHERE a.ativa
                         ORDER BY a.ordem_fluxo
                        """)
                .param("ini", p.ini()).param("fim", p.end())
                .query((rs, n) -> new FluxoArea(rs.getLong("id"), rs.getString("codigo"), rs.getString("nome"),
                        rs.getLong("entradas"), rs.getLong("saidas"),
                        arred(rs.getLong("saidas") / p.horas())))
                .list();

        List<FluxoTransicao> transicoes = jdbc.sql("""
                        WITH seq AS (
                            SELECT m.area_id, m.entrada_em,
                                   LAG(m.area_id) OVER (PARTITION BY m.veiculo_id ORDER BY m.entrada_em) AS origem_id
                              FROM movimentacao m
                        )
                        SELECT o.codigo AS origem, o.nome AS origem_nome,
                               d.codigo AS destino, d.nome AS destino_nome, count(*) AS qtd
                          FROM seq
                          JOIN area o ON o.id = seq.origem_id
                          JOIN area d ON d.id = seq.area_id
                         WHERE seq.entrada_em >= :ini AND seq.entrada_em < :fim
                         GROUP BY o.codigo, o.nome, d.codigo, d.nome, o.ordem_fluxo, d.ordem_fluxo
                         ORDER BY o.ordem_fluxo, d.ordem_fluxo
                        """)
                .param("ini", p.ini()).param("fim", p.end())
                .query((rs, n) -> new FluxoTransicao(rs.getString("origem"), rs.getString("origem_nome"),
                        rs.getString("destino"), rs.getString("destino_nome"), rs.getLong("qtd")))
                .list();

        List<FluxoHora> porHora = jdbc.sql("""
                        SELECT h.hora,
                               (SELECT count(*) FROM movimentacao m
                                 WHERE m.entrada_em >= h.hora AND m.entrada_em < h.hora + INTERVAL '1 hour') AS entradas,
                               (SELECT count(*) FROM movimentacao m
                                 WHERE m.saida_em >= h.hora AND m.saida_em < h.hora + INTERVAL '1 hour') AS saidas
                          FROM generate_series(date_trunc('hour', CAST(:ini AS timestamptz)),
                                               CAST(:fim AS timestamptz) - INTERVAL '1 microsecond',
                                               INTERVAL '1 hour') AS h(hora)
                         ORDER BY h.hora
                        """)
                .param("ini", p.ini()).param("fim", p.end())
                .query((rs, n) -> new FluxoHora(instant(rs, "hora"), rs.getLong("entradas"), rs.getLong("saidas")))
                .list();

        return new IndicadorFluxoResponse(p.inicio(), p.fim(), porArea, transicoes, porHora);
    }

    // ------------------------------------------------------------ permanencia

    public IndicadorPermanenciaResponse permanencia(Periodo p) {
        List<PermanenciaArea> areas = jdbc.sql("""
                        WITH passagens AS (
                            SELECT m.area_id, EXTRACT(EPOCH FROM (m.saida_em - m.entrada_em)) / 60.0 AS minutos
                              FROM movimentacao m
                             WHERE m.saida_em >= :ini AND m.saida_em < :fim
                        ), atuais AS (
                            SELECT m.area_id, AVG(EXTRACT(EPOCH FROM (now() - m.entrada_em)) / 60.0) AS media_atual
                              FROM movimentacao m
                             WHERE m.saida_em IS NULL
                             GROUP BY m.area_id
                        )
                        SELECT a.id, a.codigo, a.nome,
                               count(ps.minutos) AS passagens,
                               AVG(ps.minutos) AS media,
                               MIN(ps.minutos) AS minimo,
                               MAX(ps.minutos) AS maximo,
                               percentile_cont(0.5) WITHIN GROUP (ORDER BY ps.minutos) AS mediana,
                               percentile_cont(0.9) WITHIN GROUP (ORDER BY ps.minutos) AS p90,
                               MAX(at.media_atual) AS media_atual
                          FROM area a
                          LEFT JOIN passagens ps ON ps.area_id = a.id
                          LEFT JOIN atuais at ON at.area_id = a.id
                         WHERE a.ativa
                         GROUP BY a.id, a.codigo, a.nome, a.ordem_fluxo
                         ORDER BY a.ordem_fluxo
                        """)
                .param("ini", p.ini()).param("fim", p.end())
                .query((rs, n) -> new PermanenciaArea(rs.getLong("id"), rs.getString("codigo"), rs.getString("nome"),
                        rs.getLong("passagens"), dbl(rs, "media"), dbl(rs, "minimo"), dbl(rs, "maximo"),
                        dbl(rs, "mediana"), dbl(rs, "p90"), dbl(rs, "media_atual")))
                .list();
        return new IndicadorPermanenciaResponse(p.inicio(), p.fim(), areas);
    }

    // ------------------------------------------------------------- utilizacao

    public IndicadorUtilizacaoResponse utilizacao(Periodo p) {
        List<UtilizacaoArea> areas = jdbc.sql("""
                        SELECT a.id, a.codigo, a.nome, a.capacidade,
                               (SELECT count(*) FROM movimentacao m
                                 WHERE m.area_id = a.id AND m.saida_em IS NULL) AS ocupacao_atual,
                               COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (
                                                    LEAST(COALESCE(m.saida_em, now()), CAST(:fim AS timestamptz))
                                                  - GREATEST(m.entrada_em, CAST(:ini AS timestamptz)))))
                                           FROM movimentacao m
                                          WHERE m.area_id = a.id
                                            AND m.entrada_em < :fim
                                            AND COALESCE(m.saida_em, now()) > :ini), 0) AS segundos_ocupados
                          FROM area a
                         WHERE a.ativa
                         ORDER BY a.ordem_fluxo
                        """)
                .param("ini", p.ini()).param("fim", p.end())
                .query((rs, n) -> {
                    int cap = rs.getInt("capacidade");
                    long atual = rs.getLong("ocupacao_atual");
                    double media = rs.getDouble("segundos_ocupados") / (p.horas() * 3600.0);
                    return new UtilizacaoArea(rs.getLong("id"), rs.getString("codigo"), rs.getString("nome"), cap,
                            atual, arred(atual * 100.0 / cap), arred(media), arred(media * 100.0 / cap));
                })
                .list();
        return new IndicadorUtilizacaoResponse(p.inicio(), p.fim(), areas);
    }

    // ----------------------------------------------------------------- resumo

    public ResumoResponse resumo(Periodo p) {
        return jdbc.sql("""
                        SELECT
                          (SELECT count(*) FROM veiculo) AS total,
                          (SELECT count(*) FROM veiculo WHERE status = 'EM_PRODUCAO') AS em_circulacao,
                          (SELECT count(*) FROM veiculo WHERE status = 'EXPEDIDO'
                              AND ultima_movimentacao_em >= :ini AND ultima_movimentacao_em < :fim) AS expedidos,
                          (SELECT count(*) FROM movimentacao WHERE entrada_em >= :ini AND entrada_em < :fim) AS movs,
                          (SELECT count(*) FROM movimentacao WHERE entrada_em >= :ini AND entrada_em < :fim
                              AND metodo = 'AUTOMATICA') AS automaticas,
                          (SELECT AVG(EXTRACT(EPOCH FROM (v.ultima_movimentacao_em - pm.primeira)) / 60.0)
                             FROM veiculo v
                             JOIN (SELECT veiculo_id, MIN(entrada_em) AS primeira FROM movimentacao GROUP BY veiculo_id) pm
                               ON pm.veiculo_id = v.id
                            WHERE v.status = 'EXPEDIDO'
                              AND v.ultima_movimentacao_em >= :ini AND v.ultima_movimentacao_em < :fim) AS ciclo
                        """)
                .param("ini", p.ini()).param("fim", p.end())
                .query((rs, n) -> {
                    long movs = rs.getLong("movs");
                    double pctAuto = movs == 0 ? 0 : arred(rs.getLong("automaticas") * 100.0 / movs);
                    return new ResumoResponse(p.inicio(), p.fim(), rs.getLong("total"), rs.getLong("em_circulacao"),
                            rs.getLong("expedidos"), movs, pctAuto, dbl(rs, "ciclo"), maioresPermanencias(5));
                })
                .single();
    }

    private List<MaiorPermanencia> maioresPermanencias(int limite) {
        return jdbc.sql("""
                        SELECT v.chassi, v.modelo, a.nome AS area, m.entrada_em,
                               FLOOR(EXTRACT(EPOCH FROM (now() - m.entrada_em)) / 60) AS minutos
                          FROM movimentacao m
                          JOIN veiculo v ON v.id = m.veiculo_id
                          JOIN area a ON a.id = m.area_id
                         WHERE m.saida_em IS NULL
                         ORDER BY m.entrada_em
                         LIMIT :limite
                        """)
                .param("limite", limite)
                .query((rs, n) -> new MaiorPermanencia(rs.getString("chassi"), rs.getString("modelo"),
                        rs.getString("area"), instant(rs, "entrada_em"), rs.getLong("minutos")))
                .list();
    }

    // ---------------------------------------------------------------- helpers

    private static Double dbl(ResultSet rs, String col) throws SQLException {
        double v = rs.getDouble(col);
        return rs.wasNull() ? null : arred(v);
    }

    private static double arred(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        OffsetDateTime odt = rs.getObject(col, OffsetDateTime.class);
        return odt == null ? null : odt.toInstant();
    }
}

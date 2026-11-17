package br.com.tracecar.domain;

import jakarta.persistence.*;

import java.time.Duration;
import java.time.Instant;

/**
 * Permanencia de um veiculo em uma area: da entrada (leitura) ate a saida
 * (proxima leitura em outra area ou expedicao). saidaEm nulo = ainda na area.
 */
@Entity
@Table(name = "movimentacao")
public class Movimentacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "veiculo_id", nullable = false)
    private Veiculo veiculo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ponto_leitura_id")
    private PontoLeitura pontoLeitura;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MetodoIdentificacao metodo;

    @Column(name = "entrada_em", nullable = false)
    private Instant entradaEm;

    @Column(name = "saida_em")
    private Instant saidaEm;

    @Column(length = 80)
    private String operador;

    private String observacao;

    public long duracaoMinutos() {
        Instant fim = saidaEm != null ? saidaEm : Instant.now();
        return Duration.between(entradaEm, fim).toMinutes();
    }

    public Long getId() { return id; }
    public Veiculo getVeiculo() { return veiculo; }
    public void setVeiculo(Veiculo veiculo) { this.veiculo = veiculo; }
    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }
    public PontoLeitura getPontoLeitura() { return pontoLeitura; }
    public void setPontoLeitura(PontoLeitura pontoLeitura) { this.pontoLeitura = pontoLeitura; }
    public MetodoIdentificacao getMetodo() { return metodo; }
    public void setMetodo(MetodoIdentificacao metodo) { this.metodo = metodo; }
    public Instant getEntradaEm() { return entradaEm; }
    public void setEntradaEm(Instant entradaEm) { this.entradaEm = entradaEm; }
    public Instant getSaidaEm() { return saidaEm; }
    public void setSaidaEm(Instant saidaEm) { this.saidaEm = saidaEm; }
    public String getOperador() { return operador; }
    public void setOperador(String operador) { this.operador = operador; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}

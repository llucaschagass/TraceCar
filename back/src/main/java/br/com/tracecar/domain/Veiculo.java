package br.com.tracecar.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "veiculo")
public class Veiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 17)
    private String chassi;

    @Column(name = "tag_rfid", unique = true, length = 40)
    private String tagRfid;

    @Column(nullable = false, length = 40)
    private String marca;

    @Column(nullable = false, length = 60)
    private String modelo;

    @Column(length = 60)
    private String versao;

    @Column(length = 40)
    private String cor;

    @Column(name = "ano_modelo")
    private Integer anoModelo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusVeiculo status = StatusVeiculo.EM_PRODUCAO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_atual_id")
    private Area areaAtual;

    @Column(name = "ultima_movimentacao_em")
    private Instant ultimaMovimentacaoEm;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm = Instant.now();

    public Long getId() { return id; }
    public String getChassi() { return chassi; }
    public void setChassi(String chassi) { this.chassi = chassi; }
    public String getTagRfid() { return tagRfid; }
    public void setTagRfid(String tagRfid) { this.tagRfid = tagRfid; }
    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }
    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }
    public String getVersao() { return versao; }
    public void setVersao(String versao) { this.versao = versao; }
    public String getCor() { return cor; }
    public void setCor(String cor) { this.cor = cor; }
    public Integer getAnoModelo() { return anoModelo; }
    public void setAnoModelo(Integer anoModelo) { this.anoModelo = anoModelo; }
    public StatusVeiculo getStatus() { return status; }
    public void setStatus(StatusVeiculo status) { this.status = status; }
    public Area getAreaAtual() { return areaAtual; }
    public void setAreaAtual(Area areaAtual) { this.areaAtual = areaAtual; }
    public Instant getUltimaMovimentacaoEm() { return ultimaMovimentacaoEm; }
    public void setUltimaMovimentacaoEm(Instant ultimaMovimentacaoEm) { this.ultimaMovimentacaoEm = ultimaMovimentacaoEm; }
    public Instant getCriadoEm() { return criadoEm; }
}

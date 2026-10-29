package com.financeiro.financas;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.financeiro.usuario.Usuario;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** Um mês do controle financeiro de um usuário, identificado pela chave "AAAA-MM". */
@Entity
@Table(name = "meses", uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "chave"}))
public class Mes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Usuario usuario;

    @Column(nullable = false, length = 7)
    private String chave;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal bruto = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal liquido = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal extra = BigDecimal.ZERO;

    private String extraObs;

    @OneToMany(mappedBy = "mes", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<Lancamento> itens = new ArrayList<>();

    protected Mes() {
    }

    public Mes(Usuario usuario, String chave) {
        this.usuario = usuario;
        this.chave = chave;
    }

    public void adicionar(Lancamento l) {
        l.setMes(this);
        itens.add(l);
    }

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public String getChave() { return chave; }
    public BigDecimal getBruto() { return bruto; }
    public void setBruto(BigDecimal bruto) { this.bruto = bruto; }
    public BigDecimal getLiquido() { return liquido; }
    public void setLiquido(BigDecimal liquido) { this.liquido = liquido; }
    public BigDecimal getExtra() { return extra; }
    public void setExtra(BigDecimal extra) { this.extra = extra; }
    public String getExtraObs() { return extraObs; }
    public void setExtraObs(String extraObs) { this.extraObs = extraObs; }
    public List<Lancamento> getItens() { return itens; }
}

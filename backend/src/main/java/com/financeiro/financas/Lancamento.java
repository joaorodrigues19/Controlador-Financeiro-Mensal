package com.financeiro.financas;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "lancamentos")
public class Lancamento {

    public enum Tipo { Fixo, Variável, Parcelado, Eventual }
    public enum Status { Pago, Pendente }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Mes mes;

    @Column(nullable = false)
    private String item;

    @Column(nullable = false)
    private String cat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tipo tipo;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    private int dia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    /** Cartão de crédito onde a compra entra na fatura (ex.: "Nubank"); nulo para Pix, débito ou dinheiro. */
    private String cartao;

    /** Parcela no formato "atual/total", ex.: "3/10". */
    private String parc;

    /** Identifica as parcelas de uma mesma compra em meses diferentes. */
    private String grupo;

    /** Dízimo gerado automaticamente a partir do salário bruto. */
    private boolean auto;

    public Lancamento() {
    }

    /** Cópia sem id e sem mês, usada para trazer contas para outro mês. */
    public Lancamento copia() {
        Lancamento c = new Lancamento();
        c.item = item; c.cat = cat; c.tipo = tipo; c.valor = valor; c.dia = dia; c.status = status;
        c.cartao = cartao; c.parc = parc; c.grupo = grupo; c.auto = auto;
        return c;
    }

    public Long getId() { return id; }
    public Mes getMes() { return mes; }
    void setMes(Mes mes) { this.mes = mes; }
    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }
    public String getCat() { return cat; }
    public void setCat(String cat) { this.cat = cat; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }
    public int getDia() { return dia; }
    public void setDia(int dia) { this.dia = dia; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getCartao() { return cartao; }
    public void setCartao(String cartao) { this.cartao = cartao; }
    public String getParc() { return parc; }
    public void setParc(String parc) { this.parc = parc; }
    public String getGrupo() { return grupo; }
    public void setGrupo(String grupo) { this.grupo = grupo; }
    public boolean isAuto() { return auto; }
    public void setAuto(boolean auto) { this.auto = auto; }
}

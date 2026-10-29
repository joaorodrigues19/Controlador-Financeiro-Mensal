package com.financeiro.usuario;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuarios")
public class Usuario {

    public static final List<String> CATEGORIAS_PADRAO = List.of(
        "Moradia", "Transporte", "Cartão", "Fé", "Dívidas", "Família", "Compras",
        "Cuidados pessoais", "Assinaturas", "Lazer", "Alimentação", "Saúde", "Outros");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String senhaHash;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_categorias", joinColumns = @JoinColumn(name = "usuario_id"))
    @OrderColumn(name = "posicao")
    @Column(name = "nome")
    private List<String> categorias = new ArrayList<>(CATEGORIAS_PADRAO);

    protected Usuario() {
    }

    public Usuario(String nome, String email, String senhaHash) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    public String getSenhaHash() { return senhaHash; }
    public List<String> getCategorias() { return categorias; }
}

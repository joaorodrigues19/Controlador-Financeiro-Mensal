package com.financeiro.financas;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.financeiro.financas.FinancasDtos.Contagem;
import com.financeiro.financas.FinancasDtos.RenomeiaCategoria;
import com.financeiro.usuario.UsuarioAtual;

import jakarta.validation.Valid;

/** Operações de categoria que também mexem nos lançamentos; a lista em si é salva por PUT /api/perfil/categorias. */
@RestController
@RequestMapping("/api/perfil/categorias")
public class CategoriaController {

    private final FinancasService service;
    private final UsuarioAtual usuario;

    public CategoriaController(FinancasService service, UsuarioAtual usuario) {
        this.service = service;
        this.usuario = usuario;
    }

    /** Renomeia (ou junta com outra) e devolve quantos lançamentos mudaram. */
    @PostMapping("/renomear")
    public Contagem renomear(@Valid @RequestBody RenomeiaCategoria req) {
        return new Contagem(service.renomearCategoria(usuario.id(), req.de(), req.para()));
    }
}

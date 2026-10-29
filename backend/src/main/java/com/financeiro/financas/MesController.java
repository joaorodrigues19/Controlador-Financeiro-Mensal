package com.financeiro.financas;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.financeiro.financas.FinancasDtos.AtualizaLancamento;
import com.financeiro.financas.FinancasDtos.Contagem;
import com.financeiro.financas.FinancasDtos.MesDto;
import com.financeiro.financas.FinancasDtos.NovoLancamento;
import com.financeiro.financas.FinancasDtos.RendaRequest;
import com.financeiro.financas.Lancamento.Status;
import com.financeiro.usuario.UsuarioAtual;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/meses")
public class MesController {

    private final FinancasService service;
    private final UsuarioAtual usuario;

    public MesController(FinancasService service, UsuarioAtual usuario) {
        this.service = service;
        this.usuario = usuario;
    }

    @GetMapping
    public List<MesDto> listar() {
        return service.listar(usuario.id());
    }

    @PutMapping("/{chave}/renda")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void renda(@PathVariable String chave, @Valid @RequestBody RendaRequest req) {
        service.salvarRenda(usuario.id(), chave, req);
    }

    @PostMapping("/{chave}/itens")
    @ResponseStatus(HttpStatus.CREATED)
    public void criar(@PathVariable String chave, @Valid @RequestBody NovoLancamento req) {
        service.criar(usuario.id(), chave, req);
    }

    @PutMapping("/{chave}/itens/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void atualizar(@PathVariable String chave, @PathVariable Long id, @Valid @RequestBody AtualizaLancamento req) {
        service.atualizar(usuario.id(), chave, id, req);
    }

    @PostMapping("/{chave}/itens/{id}/pagamento")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void pagar(@PathVariable String chave, @PathVariable Long id) {
        service.alternarPagamento(usuario.id(), chave, id);
    }

    @PostMapping("/{chave}/faturas/{cartao}/pagamento")
    public Map<String, Status> pagarFatura(@PathVariable String chave, @PathVariable String cartao) {
        return Map.of("status", service.alternarFatura(usuario.id(), chave, cartao));
    }

    @DeleteMapping("/{chave}/itens/{id}")
    public Contagem excluir(@PathVariable String chave, @PathVariable Long id,
                            @RequestParam(defaultValue = "false") boolean futuras) {
        return new Contagem(service.excluir(usuario.id(), chave, id, futuras));
    }

    @PostMapping("/{chave}/copiar-anterior")
    public Contagem copiarAnterior(@PathVariable String chave) {
        return new Contagem(service.copiarAnterior(usuario.id(), chave));
    }
}

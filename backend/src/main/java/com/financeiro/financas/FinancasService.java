package com.financeiro.financas;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.financeiro.financas.FinancasDtos.AtualizaLancamento;
import com.financeiro.financas.FinancasDtos.MesDto;
import com.financeiro.financas.FinancasDtos.NovoLancamento;
import com.financeiro.financas.FinancasDtos.RendaRequest;
import com.financeiro.financas.Lancamento.Status;
import com.financeiro.financas.Lancamento.Tipo;
import com.financeiro.usuario.UsuarioRepository;

@Service
@Transactional
public class FinancasService {

    private static final Pattern PARCELA = Pattern.compile("^(\\d+)/(\\d+)$");
    private static final BigDecimal DIZIMO = new BigDecimal("0.10");

    private final MesRepository meses;
    private final UsuarioRepository usuarios;

    public FinancasService(MesRepository meses, UsuarioRepository usuarios) {
        this.meses = meses;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<MesDto> listar(Long usuarioId) {
        return meses.findByUsuarioIdOrderByChave(usuarioId).stream().map(MesDto::de).toList();
    }

    public void salvarRenda(Long usuarioId, String chave, RendaRequest req) {
        Mes m = obterOuCriar(usuarioId, chave);
        m.setBruto(zeroSeNulo(req.bruto()));
        m.setLiquido(zeroSeNulo(req.liquido()));
        m.setExtra(zeroSeNulo(req.extra()));
        m.setExtraObs(req.extraObs() == null ? null : req.extraObs().trim());
        sincronizarDizimo(m);
    }

    public void criar(Long usuarioId, String chave, NovoLancamento req) {
        YearMonth inicio = parse(chave);
        int n = req.tipo() == Tipo.Parcelado ? Math.max(2, Math.min(48, Objects.requireNonNullElse(req.parcelas(), 2))) : 1;
        String grupo = n > 1 ? UUID.randomUUID().toString() : null;
        BigDecimal total = req.valor().setScale(2, RoundingMode.HALF_UP);
        BigDecimal parcela = total.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
        for (int k = 0; k < n; k++) {
            Lancamento l = new Lancamento();
            l.setItem(req.item().trim());
            l.setCat(req.cat());
            l.setTipo(req.tipo());
            // a última parcela absorve a diferença de arredondamento
            l.setValor(k == n - 1 ? total.subtract(parcela.multiply(BigDecimal.valueOf(n - 1))) : parcela);
            l.setDia(req.dia());
            l.setStatus(k == 0 ? req.status() : Status.Pendente);
            l.setCartao(vazioParaNulo(req.cartao()));
            if (n > 1) {
                l.setParc((k + 1) + "/" + n);
                l.setGrupo(grupo);
            }
            obterOuCriar(usuarioId, inicio.plusMonths(k).toString()).adicionar(l);
        }
    }

    public void atualizar(Long usuarioId, String chave, Long id, AtualizaLancamento req) {
        Lancamento l = lancamento(usuarioId, chave, id);
        l.setItem(req.item().trim());
        l.setCat(req.cat());
        l.setTipo(req.tipo());
        l.setDia(req.dia());
        l.setStatus(req.status());
        l.setCartao(vazioParaNulo(req.cartao()));
        if (!l.isAuto()) {
            if (req.valor() == null || req.valor().signum() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um valor maior que zero");
            }
            l.setValor(req.valor().setScale(2, RoundingMode.HALF_UP));
        }
    }

    public void alternarPagamento(Long usuarioId, String chave, Long id) {
        Lancamento l = lancamento(usuarioId, chave, id);
        l.setStatus(l.getStatus() == Status.Pago ? Status.Pendente : Status.Pago);
    }

    /** Marca a fatura inteira de um cartão como paga, ou volta tudo para pendente se já estava paga. */
    public Status alternarFatura(Long usuarioId, String chave, String cartao) {
        Mes m = existente(usuarioId, chave);
        List<Lancamento> fatura = m.getItens().stream().filter(i -> cartao.equals(i.getCartao())).toList();
        Status novo = fatura.stream().allMatch(i -> i.getStatus() == Status.Pago) ? Status.Pendente : Status.Pago;
        fatura.forEach(i -> i.setStatus(novo));
        return novo;
    }

    /** Exclui o lançamento e, se pedido, as parcelas seguintes da mesma compra. Retorna quantos meses futuros mudaram. */
    public int excluir(Long usuarioId, String chave, Long id, boolean futuras) {
        Mes m = existente(usuarioId, chave);
        Lancamento l = m.getItens().stream().filter(i -> i.getId().equals(id)).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lançamento não encontrado"));
        m.getItens().remove(l);
        Matcher p = l.getParc() == null ? null : PARCELA.matcher(l.getParc());
        if (!futuras || p == null || !p.matches()) {
            return 0;
        }
        int k0 = Integer.parseInt(p.group(1)), total = Integer.parseInt(p.group(2)), alterados = 0;
        YearMonth base = parse(chave);
        for (int s = 1; s <= total - k0; s++) {
            String parc = (k0 + s) + "/" + total;
            var futuro = meses.findByUsuarioIdAndChave(usuarioId, base.plusMonths(s).toString());
            if (futuro.isEmpty()) {
                continue;
            }
            boolean removeu = futuro.get().getItens().removeIf(i -> l.getGrupo() != null
                ? l.getGrupo().equals(i.getGrupo())
                : i.getItem().equals(l.getItem()) && parc.equals(i.getParc()));
            if (removeu) {
                alterados++;
            }
        }
        return alterados;
    }

    /** Traz para o mês as contas recorrentes do mês anterior: fixas, variáveis e a próxima parcela de cada parcelado. */
    public int copiarAnterior(Long usuarioId, String chave) {
        String anteriorChave = parse(chave).minusMonths(1).toString();
        Mes anterior = meses.findByUsuarioIdAndChave(usuarioId, anteriorChave)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Não há mês anterior lançado"));
        Mes atual = meses.findByUsuarioIdAndChave(usuarioId, chave).orElse(null);

        Set<String> existentes = new HashSet<>();
        boolean temDizimo = false;
        if (atual != null) {
            for (Lancamento i : atual.getItens()) {
                existentes.add(i.getItem().toLowerCase() + "|" + Objects.toString(i.getParc(), ""));
                temDizimo |= i.isAuto();
            }
        }

        List<Lancamento> novos = new java.util.ArrayList<>();
        for (Lancamento i : anterior.getItens()) {
            String parc = null;
            if (i.getTipo() == Tipo.Parcelado) {
                Matcher p = i.getParc() == null ? null : PARCELA.matcher(i.getParc());
                if (p == null || !p.matches() || Integer.parseInt(p.group(1)) >= Integer.parseInt(p.group(2))) {
                    continue;
                }
                parc = (Integer.parseInt(p.group(1)) + 1) + "/" + p.group(2);
            } else if (i.getTipo() == Tipo.Eventual) {
                continue;
            }
            if (!existentes.add(i.getItem().toLowerCase() + "|" + Objects.toString(parc, ""))) {
                continue;
            }
            if (i.isAuto() && temDizimo) {
                continue;
            }
            Lancamento c = i.copia();
            c.setStatus(Status.Pendente);
            c.setParc(parc);
            if (parc == null) {
                c.setGrupo(null);
            }
            novos.add(c);
        }
        if (novos.isEmpty()) {
            return 0;
        }

        Mes destino = atual != null ? atual : obterOuCriar(usuarioId, chave);
        if (destino.getLiquido().signum() == 0 && destino.getBruto().signum() == 0) {
            destino.setLiquido(anterior.getLiquido());
            destino.setBruto(anterior.getBruto());
        }
        novos.forEach(destino::adicionar);
        sincronizarDizimo(destino);
        return novos.size();
    }

    /** Mantém o lançamento automático de dízimo em 10% do salário bruto do mês. */
    private void sincronizarDizimo(Mes m) {
        if (m.getBruto().signum() == 0) {
            return;
        }
        BigDecimal valor = m.getBruto().multiply(DIZIMO).setScale(2, RoundingMode.HALF_UP);
        m.getItens().stream().filter(Lancamento::isAuto).findFirst().ifPresentOrElse(d -> d.setValor(valor), () -> {
            Lancamento d = new Lancamento();
            d.setItem("Dízimo");
            d.setCat("Fé");
            d.setTipo(Tipo.Variável);
            d.setValor(valor);
            d.setDia(6);
            d.setStatus(Status.Pendente);
            d.setAuto(true);
            m.adicionar(d);
        });
    }

    private Mes obterOuCriar(Long usuarioId, String chave) {
        String k = parse(chave).toString();
        return meses.findByUsuarioIdAndChave(usuarioId, k)
            .orElseGet(() -> meses.save(new Mes(usuarios.getReferenceById(usuarioId), k)));
    }

    private Mes existente(Long usuarioId, String chave) {
        return meses.findByUsuarioIdAndChave(usuarioId, parse(chave).toString())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mês não encontrado"));
    }

    private Lancamento lancamento(Long usuarioId, String chave, Long id) {
        return existente(usuarioId, chave).getItens().stream().filter(i -> i.getId().equals(id)).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lançamento não encontrado"));
    }

    private static YearMonth parse(String chave) {
        try {
            return YearMonth.parse(chave);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mês inválido: use AAAA-MM");
        }
    }

    private static BigDecimal zeroSeNulo(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }

    private static String vazioParaNulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}

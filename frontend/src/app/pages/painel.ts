import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FinancasStore, SEM_FILTROS } from '../core/state/financas.store';
import {
  TIPOS, TIPO_COR, brl, brl0, catTotals, daysTo, esc, groupNub, keyAdd, keyLabel, parcInfo, pct, porDia, renda, total,
} from '../core/domain/financas.calc';
import { Lancamento } from '../core/domain/models';

/** Painel do mês: sobra prevista, para onde vai o salário, vencimentos, parcelas e fatura do cartão. */
@Component({
  selector: 'app-painel',
  templateUrl: './painel.html',
})
export class Painel {
  protected store = inject(FinancasStore);
  private router = inject(Router);
  protected f = { brl, brl0, pct };

  protected rotulo = computed(() => keyLabel(this.store.cur(), true));
  protected rotuloAnterior = computed(() => keyLabel(keyAdd(this.store.cur(), -1), true));
  protected rotuloAnteriorCurto = computed(() => keyLabel(keyAdd(this.store.cur(), -1)));
  protected temAnterior = computed(() => !!this.store.mes(keyAdd(this.store.cur(), -1)));

  protected vm = computed(() => {
    const k = this.store.cur();
    const m = this.store.mes(k);
    if (!m || (!m.itens.length && !renda(m))) return null;

    const R = renda(m), G = total(m), P = total(m, i => i.status === 'Pago'), A = Math.round((G - P) * 100) / 100, sobra = Math.round((R - G) * 100) / 100;
    const prevM = this.store.mes(keyAdd(k, -1));
    const scale = Math.max(R, G) || 1;
    const byTipo = TIPOS.map(tipo => {
      const valor = total(m, i => i.tipo === tipo);
      return { tipo, valor, cor: TIPO_COR[tipo], tip: tipHtml(tipo, [[brl(valor), pct(R ? valor / R : 0)]]) };
    });

    const ct = catTotals(m), cp = catTotals(prevM);
    const cats = Object.entries(ct).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => {
      const pv = cp[nome] || 0, dif = valor - pv;
      return {
        nome, valor, dif,
        difTxt: (dif > 0.5 ? '▲ ' : dif < -0.5 ? '▼ ' : '') + (Math.abs(dif) < 0.5 ? 'igual ao mês anterior' : brl0(Math.abs(dif)) + (dif > 0 ? ' a mais' : ' a menos')),
        tip: tipHtml(nome, [['Este mês', brl(valor)], ['Mês anterior', brl(pv)]]),
      };
    });

    const pend = groupNub(m.itens.filter(i => i.status !== 'Pago')).sort((a, b) => (a.dia || 99) - (b.dia || 99));
    const top = [...m.itens].sort((a, b) => b.valor - a.valor).slice(0, 6);
    const fut = Array.from({ length: 6 }, (_, x) => {
      const fk = keyAdd(k, x + 1), fm = this.store.mes(fk);
      const valor = total(fm, i => i.tipo === 'Parcelado'), n = fm ? fm.itens.filter(i => i.tipo === 'Parcelado').length : 0;
      return { k: fk, label: keyLabel(fk, true), valor, tip: tipHtml(keyLabel(fk, true), [[`${n} parcela${n === 1 ? '' : 's'}`, brl(valor)]]) };
    });

    const parcs = m.itens.map(i => ({ i, info: parcInfo(k, i.parc)! })).filter(p => p.info).sort((a, b) => b.i.valor - a.i.valor)
      .map(p => {
        const n = Math.min(p.info.n, 24);
        return { ...p, barras: Array.from({ length: n }, (_, x) => x < Math.round(p.info.a * n / p.info.n)) };
      });

    const nub = m.itens.filter(i => i.cartao === 'Nubank');
    const porCat: Record<string, Lancamento[]> = {};
    nub.forEach(i => (porCat[i.cat] ??= []).push(i));
    const nubCats = Object.entries(porCat)
      .map(([nome, itens]) => ({ nome, itens: itens.sort((a, b) => b.valor - a.valor), valor: itens.reduce((a, i) => a + i.valor, 0) }))
      .sort((a, b) => b.valor - a.valor);

    return {
      m, R, G, P, A, sobra, scale, byTipo, cats, pend, top, fut, parcs, nub, nubCats,
      temAnterior: !!prevM,
      tipLivre: tipHtml('Livre', [[brl(sobra), pct(R ? sobra / R : 0)]]),
      maxC: cats.length ? cats[0].valor : 1,
      maxF: Math.max(...fut.map(x => x.valor), 1),
      fe: total(m, i => i.cat === 'Fé'),
      parcsTotal: parcs.reduce((a, p) => a + p.i.valor, 0),
      nubT: nub.reduce((a, i) => a + i.valor, 0),
      cartaoUnico: total(m, i => i.cat === 'Cartão'),
    };
  });

  quando(i: Lancamento): { txt: string; cls: string } {
    const d = daysTo(this.store.cur(), i.dia);
    if (d < 0) return { txt: `atrasado ${-d}d`, cls: 'late' };
    if (d === 0) return { txt: 'vence hoje', cls: 'soon' };
    if (d <= 3) return { txt: `em ${d} dia${d > 1 ? 's' : ''}`, cls: 'soon' };
    return { txt: `dia ${i.dia || '—'}`, cls: '' };
  }

  /** Abre o lançamento para edição; a linha agrupada da fatura leva às compras do cartão. */
  abrirLinha(i: Lancamento): void {
    if (i.synthetic) this.verLancamentos('Nubank');
    else this.store.abrir({ tipo: 'item', id: i.id });
  }

  verLancamentos(cartao: string): void {
    this.store.filtros.set({ ...SEM_FILTROS, cartao });
    this.router.navigateByUrl('/lancamentos');
  }

  cor(i: Lancamento): string {
    return TIPO_COR[i.tipo] || 'var(--faint)';
  }

  alternarNub(cat: string): void {
    this.store.nubAbertas.update(s => {
      const n = new Set(s);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  }
}

/** Conteúdo do tooltip: título em negrito e linhas "rótulo · valor". */
function tipHtml(titulo: string, linhas: [string, string][]): string {
  return `<b>${esc(titulo)}</b>` + linhas.map(([a, b]) => `<div class="r"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('');
}

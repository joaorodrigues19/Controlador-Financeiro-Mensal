import { Component, computed, inject } from '@angular/core';
import {
  MESES, MESES_L, brl, brl0, catTotals, esc, intBR, keyLabel, parcInfo, pct, renda, todayKey, total,
} from '../core/domain/financas.calc';
import { FinancasStore } from '../core/state/financas.store';

/** Geometria do gráfico de barras (viewBox 760×260). */
const W = 760, H = 260, PL = 48, PR = 8, PT = 12, PB = 28, CW = (W - PL - PR) / 12, BW = Math.min(16, (CW - 10) / 2);

interface Divida {
  item: string; n: number; cartao?: string | null; rest: number; qtd: number; ate: string;
  prox: string | null; proxVal: number; minPend: number;
}

/** Visão do ano: quanto ainda devo em parcelas, renda x gastos mês a mês e gastos por categoria. */
@Component({
  selector: 'app-visao-geral',
  templateUrl: './visao-geral.html',
})
export class VisaoGeral {
  protected store = inject(FinancasStore);
  protected f = { brl, brl0, pct, intBR, keyLabel };
  protected meses = MESES;
  protected chart = { W, H };

  protected ano = computed(() => this.store.cur().slice(0, 4));

  /** Parcelas ainda não pagas de todos os parcelamentos, agrupadas por compra. */
  protected dividas = computed(() => {
    const g: Record<string, Divida> = {};
    for (const k of this.store.chaves()) {
      for (const i of this.store.mes(k)!.itens) {
        const p = parcInfo(k, i.parc);
        if (!p) continue;
        const chave = i.grupo || i.item.trim().toLowerCase() + '|' + p.n;
        const d = (g[chave] ??= { item: i.item, n: p.n, cartao: i.cartao, rest: 0, qtd: 0, ate: k, prox: null, proxVal: 0, minPend: 99 });
        if (k > d.ate) d.ate = k;
        if (i.status !== 'Pago') {
          d.rest += +i.valor || 0;
          d.qtd++;
          if (p.a < d.minPend) { d.minPend = p.a; d.prox = k; d.proxVal = i.valor; }
        }
      }
    }
    const lista = Object.values(g).filter(d => d.qtd > 0).sort((a, b) => b.rest - a.rest).map(d => {
      const pagas = d.n - d.qtd;
      return { ...d, pagas, largura: Math.round(pagas / d.n * 100), ateTxt: keyLabel(d.ate, true) };
    });
    const fim = lista.reduce((a, d) => (d.ate > a ? d.ate : a), '');
    return { lista, total: lista.reduce((a, d) => a + d.rest, 0), fim: fim ? keyLabel(fim, true) : '' };
  });

  protected vm = computed(() => {
    const y = this.ano(), cur = this.store.cur();
    const ks = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
    const data = ks.map(k => {
      const m = this.store.mes(k);
      return { k, R: renda(m), G: total(m), has: !!(m && (m.itens.length || renda(m))), fut: k > todayKey };
    });
    const done = data.filter(d => d.has && d.k <= todayKey);
    const sR = done.reduce((a, d) => a + d.R, 0), sG = done.reduce((a, d) => a + d.G, 0);
    const gastosAno = data.reduce((a, d) => a + d.G, 0);

    // gráfico
    const max = Math.max(...data.map(d => Math.max(d.R, d.G)), 1);
    const niceMax = Math.ceil(max / 2000) * 2000;
    const yv = (v: number) => PT + (H - PT - PB) * (1 - v / niceMax);
    const grade = [0, 1, 2, 3, 4].map(s => {
      const v = niceMax / 4 * s;
      return { y: yv(v), label: `${(v / 1000).toLocaleString('pt-BR')}k` };
    });
    const barra = (x: number, v: number, cor: string, fut: boolean) => ({
      d: `M${x},${yv(0)} V${yv(v) + 4} q0,-4 4,-4 h${BW - 8} q4,0 4,4 V${yv(0)} Z`, cor, opacidade: fut ? 0.45 : 1,
      tx: x + BW / 2, ty: yv(v) - 5, txt: `${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`,
    });
    const colunas = data.map((d, i) => {
      const x0 = PL + i * CW + (CW - 2 * BW - 7) / 2, sobra = d.R - d.G;
      return {
        barras: [d.R > 0 ? barra(x0, d.R, 'var(--s1)', d.fut) : null, d.G > 0 ? barra(x0 + BW + 7, d.G, 'var(--s2)', d.fut) : null]
          .filter(b => b !== null),
        lx: PL + i * CW + CW / 2, mes: MESES[i], atual: d.k === cur, hx: PL + i * CW,
        tip: `<b>${MESES_L[i]}${d.fut ? ' (previsto)' : ''}</b>`
          + `<div class='r'><span>Renda</span><span>${esc(brl(d.R))}</span></div>`
          + `<div class='r'><span>Gastos</span><span>${esc(brl(d.G))}</span></div>`
          + `<div class='r'><span>Sobra</span><span style='color:${sobra < 0 ? 'var(--bad)' : 'var(--good)'}'>${esc(brl(sobra))}</span></div>`,
      };
    });

    // mapa de calor das categorias
    const porMes = ks.map(k => catTotals(this.store.mes(k)));
    const somaCat: Record<string, number> = {};
    porMes.forEach(c => Object.entries(c).forEach(([n, v]) => (somaCat[n] = (somaCat[n] || 0) + v)));
    const cats = Object.entries(somaCat).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const cellMax = Math.max(1, ...porMes.flatMap(c => Object.values(c)));
    const nMeses = data.filter(d => d.has).length || 1;
    const calor = cats.map(c => {
      const vals = porMes.map(pm => pm[c] || 0), tot = vals.reduce((a, b) => a + b, 0);
      return {
        nome: c, total: tot, media: tot / nMeses,
        celulas: vals.map((v, i) => ({
          v, titulo: `${c} · ${MESES_L[i]}: ${brl(v)}`, claro: v / cellMax > 0.55,
          fundo: v ? `color-mix(in oklab,var(--s1) ${Math.round(12 + 58 * v / cellMax)}%,var(--surface))` : 'transparent',
        })),
      };
    });

    return {
      data, done, sR, sG, gastosAno, grade, colunas, calor, cats,
      maiorCat: cats[0] ?? null,
      maiorCatPct: cats[0] ? pct(somaCat[cats[0]] / (gastosAno || 1)) : '',
      altura: H - PT - PB, topo: PT, base: H - 8, larguraColuna: CW, xGrade: [PL, W - PR], xRotulo: PL - 8,
    };
  });
}

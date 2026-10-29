import { Component, computed, inject } from '@angular/core';
import { FinancasStore } from '../core/financas.store';
import {
  TIPOS, TIPO_COR, brl, brl0, catTotals, daysTo, esc, groupNub, keyAdd, keyLabel, parcInfo, pct, porDia, renda, total,
} from '../core/format';
import { Lancamento } from '../core/models';

/** Painel do mês: sobra prevista, para onde vai o salário, vencimentos, parcelas e fatura do cartão. */
@Component({
  selector: 'app-painel',
  template: `
    @let v = vm();
    @if (!v) {
      <div class="card"><div class="empty">
        <h3 style="justify-content:center">Nada lançado em {{ rotulo() }}</h3>
        <p>Comece pela renda do mês ou traga as contas recorrentes do mês anterior.</p>
        <div class="actions" style="justify-content:center">
          <button class="btn" (click)="store.abrir({ tipo: 'renda' })">Informar renda</button>
          @if (temAnterior()) {
            <button class="btn primary" (click)="store.copiarAnterior()">Trazer contas de {{ rotuloAnterior() }}</button>
          }
        </div>
      </div></div>
    } @else {
      <div class="grid">
        <div class="card c12"><div class="hero">
          <div>
            <div class="eyebrow">Sobra prevista em {{ rotulo() }}</div>
            <div class="big num" [style.color]="v.sobra < 0 ? 'var(--bad)' : 'var(--fg)'">{{ f.brl(v.sobra) }}</div>
            @if (v.R) {
              <span class="pill" [class.bad]="v.sobra < 0" [class.good]="v.sobra > 0" [class.neutral]="v.sobra === 0">
                {{ v.sobra < 0 ? '▼ Mês no vermelho' : v.sobra > 0 ? '▲ Mês no azul' : '● Mês fechado no zero' }}</span>
            } @else {
              <span class="pill neutral">● Renda ainda não informada</span>
            }
            <span class="hint" style="margin-left:8px">{{ f.pct(v.R ? v.G / v.R : 0) }} da renda comprometida</span>
          </div>
          <div class="kpis">
            <div class="kpi"><div class="eyebrow">Renda</div><div class="v num">{{ f.brl(v.R) }}</div>
              <div class="h">{{ v.m.extra ? 'inclui ' + f.brl0(v.m.extra) + ' extra' : 'líquido do mês' }} ·
                <button class="linkbtn" (click)="store.abrir({ tipo: 'renda' })">editar</button></div></div>
            <div class="kpi"><div class="eyebrow">Lançado</div><div class="v num">{{ f.brl(v.G) }}</div>
              <div class="h">{{ v.m.itens.length }} lançamentos</div></div>
            <div class="kpi"><div class="eyebrow">Já pago</div><div class="v num">{{ f.brl(v.P) }}</div>
              <div class="h">saldo hoje {{ f.brl0(v.R - v.P) }}</div></div>
            <div class="kpi"><div class="eyebrow">A pagar</div>
              <div class="v num" [style.color]="v.A > 0 ? 'var(--warn)' : 'var(--fg)'">{{ f.brl(v.A) }}</div>
              <div class="h">{{ v.pend.length }} pendente{{ v.pend.length === 1 ? '' : 's' }}</div></div>
          </div>
        </div></div>

        <div class="card c12">
          <h3>Para onde vai o salário <span class="sub">por tipo de gasto, em % da renda</span></h3>
          <div class="stack" role="img" aria-label="Distribuição da renda por tipo">
            @for (t of v.byTipo; track t.tipo) {
              @if (t.valor > 0) {
                <i [style.width.%]="t.valor / v.scale * 100" [style.background]="t.cor" [attr.data-tip]="t.tip"></i>
              }
            }
            @if (v.sobra > 0) {
              <i class="free" [style.width.%]="v.sobra / v.scale * 100" [attr.data-tip]="v.tipLivre"></i>
            }
          </div>
          <div class="legend">
            @for (t of v.byTipo; track t.tipo) {
              <div class="lg"><span class="sw" [style.background]="t.cor"></span><div><span class="muted">{{ t.tipo }}</span>
                <b class="num">{{ f.brl0(t.valor) }}</b><span class="hint">{{ f.pct(v.R ? t.valor / v.R : 0) }} da renda</span></div></div>
            }
            <div class="lg"><span class="sw free"></span><div><span class="muted">{{ v.sobra < 0 ? 'Faltando' : 'Livre' }}</span>
              <b class="num" [style.color]="v.sobra < 0 ? 'var(--bad)' : 'var(--fg)'">{{ f.brl0(v.sobra) }}</b>
              <span class="hint">{{ f.pct(v.R ? v.sobra / v.R : 0) }} da renda</span></div></div>
          </div>
        </div>

        <div class="card c7">
          <h3>O que mais consome o salário <span class="sub">vs {{ rotuloAnteriorCurto() }}</span></h3>
          <div class="rank">
            @for (c of v.cats; track c.nome) {
              <div class="rk" [attr.data-tip]="c.tip">
                <div class="nm">{{ c.nome }}</div><div class="vl num">{{ f.brl(c.valor) }}</div>
                <div class="track"><div class="fill" [style.width.%]="c.valor / v.maxC * 100"></div></div>
                <div class="meta"><span>{{ f.pct(v.R ? c.valor / v.R : 0) }} da renda</span>
                  @if (v.temAnterior) {
                    <span [class.up]="c.dif > 0.5" [class.down]="c.dif < -0.5">{{ c.difTxt }}</span>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty">Sem gastos lançados</div>
            }
          </div>
        </div>

        <div class="card c5">
          <h3>Próximos vencimentos <span class="sub">{{ f.brl0(v.A) }} a pagar</span></h3>
          <div class="rows">
            @for (i of v.pend.slice(0, 8); track i.id) {
              <div class="row">
                <button class="chk" (click)="store.alternarPagamento(i.id)" [attr.aria-label]="'Marcar ' + i.item + ' como pago'"></button>
                <div style="min-width:0"><div class="t">{{ i.item }}</div>
                  <div class="m"><span [class]="quando(i).cls">{{ quando(i).txt }}</span> · {{ i.synthetic ? 'fatura · ' + i.n + ' compras' : i.cat }}</div></div>
                <div class="val num">{{ f.brl(i.valor) }}</div>
              </div>
            } @empty {
              <div class="empty">Tudo pago neste mês ✓</div>
            }
          </div>
          @if (v.pend.length > 8) {
            <div class="hint" style="margin-top:6px">+ {{ v.pend.length - 8 }} pendente{{ v.pend.length - 8 > 1 ? 's' : '' }}</div>
          }
        </div>

        <div class="card c6">
          <h3>Maiores lançamentos</h3>
          <div class="rows">
            @for (i of v.top; track i.id) {
              <div class="row"><span class="dot" [style.background]="cor(i)"></span>
                <div style="min-width:0"><div class="t">{{ i.item }}
                  @if (i.parc) { <span class="tag ptag">{{ i.parc }}</span> }
                  @if (i.cartao) { <span class="tag ctag">{{ i.cartao }}</span> }</div>
                  <div class="m">{{ i.cat }} · {{ i.tipo }}</div></div>
                <div class="val num">{{ f.brl(i.valor) }}<small>{{ f.pct(v.R ? i.valor / v.R : 0) }}</small></div>
              </div>
            }
          </div>
        </div>

        <div class="card c6">
          <h3>Parcelas já assumidas <span class="sub">próximos 6 meses</span></h3>
          <div class="rank">
            @for (x of v.fut; track x.k) {
              <div class="rk" [attr.data-tip]="x.tip">
                <div class="nm">{{ x.label }}</div>
                <div class="vl num">@if (x.valor) { {{ f.brl(x.valor) }} } @else { <span class="muted">livre</span> }</div>
                <div class="track"><div class="fill" [style.width.%]="x.valor / v.maxF * 100" style="background:var(--s3)"></div></div>
              </div>
            }
          </div>
          <p class="hint" style="margin:12px 0 0">Fé neste mês: <b class="num">{{ f.brl(v.fe) }}</b>
            @if (v.m.bruto) { · dízimo calculado sobre {{ f.brl(v.m.bruto) }} bruto }</p>
        </div>

        <div class="card c7">
          <h3>Parcelamentos em andamento <span class="sub">{{ v.parcs.length }} neste mês · {{ f.brl0(v.parcsTotal) }}</span></h3>
          <div class="rows">
            @for (p of v.parcs; track p.i.id) {
              <div class="row" style="grid-template-columns:minmax(0,1fr) auto"><div style="min-width:0">
                <div class="t">{{ p.i.item }}<span class="tag ptag">{{ p.info.a }} de {{ p.info.n }}</span>
                  @if (p.i.cartao) { <span class="tag ctag">{{ p.i.cartao }}</span> }</div>
                <div class="m">{{ p.info.falta ? 'faltam ' + p.info.falta + ' · termina em ' + p.info.fim : 'última parcela neste mês' }}</div>
                <div class="prog" aria-hidden="true">@for (on of p.barras; track $index) { <i [class.on]="on"></i> }</div>
              </div><div class="val num">{{ f.brl(p.i.valor) }}<small>por mês</small></div></div>
            } @empty {
              <div class="empty">Nenhum parcelamento neste mês</div>
            }
          </div>
        </div>

        <div class="card c5">
          <h3>Fatura Nubank <span class="sub">vence dia 9</span></h3>
          @if (v.nub.length) {
            <div class="big num" style="font-size:30px;margin:0 0 4px">{{ f.brl(v.nubT) }}</div>
            <div class="hint" style="margin-bottom:14px">{{ v.nub.length }} compras · {{ f.pct(v.R ? v.nubT / v.R : 0) }} da renda</div>
            <div class="rank">
              @for (c of v.nubCats; track c.nome) {
                @let aberta = store.nubAbertas().has(c.nome);
                <div>
                  <div class="rk">
                    <div class="nm" style="display:flex;align-items:center;gap:8px">
                      <button class="xbtn" (click)="alternarNub(c.nome)" [attr.aria-expanded]="aberta"
                              [attr.aria-label]="(aberta ? 'Recolher ' : 'Ver itens de ') + c.nome">{{ aberta ? '×' : '+' }}</button>
                      {{ c.nome }} <span class="hint" style="font-weight:500">{{ c.itens.length }}</span></div>
                    <div class="vl num">{{ f.brl(c.valor) }}</div>
                    <div class="track"><div class="fill" [style.width.%]="c.valor / v.nubCats[0].valor * 100" style="background:var(--accent)"></div></div>
                  </div>
                  @if (aberta) {
                    <div class="sublist">
                      @for (i of c.itens; track i.id) {
                        <div class="sub"><span class="t">{{ i.item }}@if (i.parc) { <span class="tag ptag">{{ i.parc }}</span> }</span>
                          <span class="num">{{ f.brl(i.valor) }}</span></div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty">
              @if (v.cartaoUnico) { Fatura lançada como valor único ({{ f.brl(v.cartaoUnico) }}). Lance as compras com a forma "Cartão Nubank" para detalhar. }
              @else { Sem compras no cartão neste mês }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class Painel {
  protected store = inject(FinancasStore);
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

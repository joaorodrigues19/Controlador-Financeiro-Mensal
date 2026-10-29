import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Filtros, FinancasStore } from '../core/financas.store';
import { TIPOS, TIPO_COR, brl, groupNub, keyLabel, parcInfo, porDia } from '../core/format';
import { Lancamento } from '../core/models';

@Component({
  selector: 'app-lancamentos',
  imports: [FormsModule],
  template: `
    @let f = store.filtros();
    @let v = vm();
    <div class="lanchead">
      <button class="btn" (click)="voltar()">← Voltar ao painel</button>
      <h2>Lançamentos de {{ rotulo() }}</h2>
    </div>
    <div class="card">
      <div class="toolbar">
        <input class="search" placeholder="Buscar lançamento" aria-label="Buscar" [ngModel]="f.q" (ngModelChange)="filtrar('q', $event)">
        <select class="sel" aria-label="Categoria" [ngModel]="f.cat" (ngModelChange)="filtrar('cat', $event)">
          <option value="">Todas as categorias</option>
          @for (c of v.cats; track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <select class="sel" aria-label="Tipo" [ngModel]="f.tipo" (ngModelChange)="filtrar('tipo', $event)">
          <option value="">Todos os tipos</option>
          @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
        </select>
        <select class="sel" aria-label="Status" [ngModel]="f.status" (ngModelChange)="filtrar('status', $event)">
          <option value="">Pago e pendente</option><option value="Pago">Pago</option><option value="Pendente">Pendente</option>
        </select>
        <select class="sel" aria-label="Forma de pagamento" [ngModel]="f.cartao" (ngModelChange)="filtrar('cartao', $event)">
          <option value="">Todas as formas</option><option value="Nubank">Cartão Nubank</option><option value="-">Fora do cartão</option>
        </select>
      </div>
      <div class="sumline">
        <span>{{ v.lista.length }} itens</span><span>Total <b>{{ brl(v.T) }}</b></span>
        <span>Pago <b>{{ brl(v.Tp) }}</b></span><span>A pagar <b>{{ brl(v.T - v.Tp) }}</b></span>
        <span style="margin-left:auto;display:flex;gap:12px">
          <button class="linkbtn" (click)="store.abrir({ tipo: 'renda' })">Renda do mês</button>
          <button class="linkbtn" (click)="store.copiarAnterior()">Trazer contas do mês anterior</button>
        </span>
      </div>
      @if (f.cartao === 'Nubank') {
        <div class="sumline"><button class="linkbtn" (click)="filtrar('cartao', '')">← voltar para todos os lançamentos</button></div>
      }
      <div class="rows">
        @for (i of v.view; track i.id) {
          <div class="row click" (click)="abrir(i)">
            <button class="chk" [class.on]="i.status === 'Pago'" (click)="$event.stopPropagation(); store.alternarPagamento(i.id)"
                    [attr.aria-label]="i.status === 'Pago' ? 'Pago. Marcar como pendente' : 'Pendente. Marcar como pago'">{{ i.status === 'Pago' ? '✓' : '' }}</button>
            <div style="min-width:0">
              <div class="t">{{ i.item }}
                @if (i.parc) { <span class="tag ptag">{{ i.parc }}</span> }
                @if (i.cartao) { <span class="tag ctag">{{ i.cartao }}</span> }</div>
              <div class="m"><span class="dot" [style.background]="cor(i)" style="display:inline-block;margin-right:5px"></span>{{ meta(i) }}</div>
            </div>
            <div class="val num">{{ brl(i.valor) }}<small>{{ i.status }}</small></div>
          </div>
        } @empty {
          <div class="empty">{{ v.temItens ? 'Nenhum lançamento com esses filtros' : 'Nenhum lançamento em ' + rotulo() + '. Use o botão + para adicionar.' }}</div>
        }
      </div>
    </div>
  `,
})
export class Lancamentos {
  protected store = inject(FinancasStore);
  private router = inject(Router);
  protected tipos = TIPOS;
  protected brl = brl;

  protected rotulo = computed(() => keyLabel(this.store.cur(), true));

  protected vm = computed(() => {
    const m = this.store.mes(this.store.cur()), f = this.store.filtros(), q = f.q.trim().toLowerCase();
    const itens = m ? m.itens : [];
    const cats = [...new Set([...this.store.categorias(), ...itens.map(i => i.cat)])];
    const lista = itens.filter(i => (!q || i.item.toLowerCase().includes(q)) && (!f.cat || i.cat === f.cat) && (!f.tipo || i.tipo === f.tipo)
      && (!f.status || i.status === f.status) && (!f.cartao || (f.cartao === '-' ? !i.cartao : i.cartao === f.cartao))).sort(porDia);
    const T = lista.reduce((a, i) => a + i.valor, 0), Tp = lista.filter(i => i.status === 'Pago').reduce((a, i) => a + i.valor, 0);
    // sem busca nem filtro de categoria, as compras do cartão aparecem como uma linha de fatura
    const view = !q && !f.cat && f.cartao !== 'Nubank' ? groupNub(lista).sort(porDia) : lista;
    return { cats, lista, view, T, Tp, temItens: itens.length > 0 };
  });

  filtrar(campo: keyof Filtros, valor: string): void {
    this.store.filtros.update(f => ({ ...f, [campo]: valor }));
  }

  abrir(i: Lancamento): void {
    if (i.synthetic) this.filtrar('cartao', 'Nubank');
    else this.store.abrir({ tipo: 'item', id: i.id });
  }

  meta(i: Lancamento): string {
    if (i.synthetic) return `fatura do cartão · ${i.n} compras · dia ${i.dia} · toque para ver`;
    const p = parcInfo(this.store.cur(), i.parc);
    return `${p ? p.txt + ' · ' : ''}${i.cat} · dia ${i.dia || '—'}`;
  }

  cor(i: Lancamento): string {
    return TIPO_COR[i.tipo] || 'var(--faint)';
  }

  voltar(): void {
    this.router.navigateByUrl('/painel');
  }
}

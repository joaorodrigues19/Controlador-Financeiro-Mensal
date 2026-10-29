import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Filtros, FinancasStore } from '../core/state/financas.store';
import { TIPOS, TIPO_COR, brl, groupNub, keyLabel, parcInfo, porDia } from '../core/domain/financas.calc';
import { Lancamento } from '../core/domain/models';

@Component({
  selector: 'app-lancamentos',
  imports: [FormsModule],
  templateUrl: './lancamentos.html',
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

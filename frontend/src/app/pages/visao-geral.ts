import { Component, inject } from '@angular/core';
import { FinancasStore } from '../core/state/financas.store';

@Component({
  selector: 'app-visao-geral',
  template: `<div class="card"><div class="placeholder">Visão geral de {{ store.cur().slice(0, 4) }} — em construção</div></div>`,
})
export class VisaoGeral {
  protected store = inject(FinancasStore);
}

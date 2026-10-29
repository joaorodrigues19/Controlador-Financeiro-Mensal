import { Component, inject } from '@angular/core';
import { FinancasStore } from '../core/financas.store';
import { keyLabel } from '../core/format';

@Component({
  selector: 'app-painel',
  template: `<div class="card"><div class="placeholder">Painel de {{ label() }} — em construção</div></div>`,
})
export class Painel {
  private store = inject(FinancasStore);
  label = () => keyLabel(this.store.cur(), true);
}

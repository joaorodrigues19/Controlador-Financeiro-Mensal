import { Component, HostListener, inject } from '@angular/core';
import { FinancasStore } from '../core/financas.store';
import { ModalItem } from './modal-item';
import { ModalRenda } from './modal-renda';

/** Folha modal (sobe de baixo no celular, centralizada no desktop) com o formulário aberto no store. */
@Component({
  selector: 'app-modal-host',
  imports: [ModalRenda, ModalItem],
  template: `
    @if (store.modal(); as m) {
      <div class="scrim" (click)="fora($event)">
        <div class="sheet" role="dialog" aria-modal="true">
          @switch (m.tipo) {
            @case ('renda') { <app-modal-renda /> }
            @case ('item') { <app-modal-item [id]="$any(m).id" /> }
          }
        </div>
      </div>
    }
  `,
})
export class ModalHost {
  protected store = inject(FinancasStore);

  fora(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.store.fechar();
  }

  @HostListener('document:keydown.escape')
  esc(): void {
    this.store.fechar();
  }
}

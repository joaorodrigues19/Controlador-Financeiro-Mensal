import { Component, HostListener, inject } from '@angular/core';
import { FinancasStore } from '../core/state/financas.store';
import { ModalItem } from './modal-item';
import { ModalRenda } from './modal-renda';

/** Folha modal (sobe de baixo no celular, centralizada no desktop) com o formulário aberto no store. */
@Component({
  selector: 'app-modal-host',
  imports: [ModalRenda, ModalItem],
  templateUrl: './modal-host.html',
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

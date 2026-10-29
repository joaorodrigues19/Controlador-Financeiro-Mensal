import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancasStore } from '../core/state/financas.store';
import { brl, keyLabel, parseValor } from '../core/domain/financas.calc';

const paraCampo = (v?: number) => (v ? String(v).replace('.', ',') : '');

@Component({
  selector: 'app-modal-renda',
  imports: [FormsModule],
  templateUrl: './modal-renda.html',
})
export class ModalRenda {
  protected store = inject(FinancasStore);
  private m = this.store.mes(this.store.cur());
  protected titulo = keyLabel(this.store.cur(), true);

  protected bruto = signal(paraCampo(this.m?.bruto));
  protected liquido = signal(paraCampo(this.m?.liquido));
  protected extra = signal(paraCampo(this.m?.extra));
  protected obs = this.m?.extraObs ?? '';

  protected dica = computed(() => {
    const b = parseValor(this.bruto());
    return b
      ? `Dízimo (10% do bruto): ${brl(b * 0.1)}. Renda do mês: ${brl(parseValor(this.liquido()) + parseValor(this.extra()))}.`
      : 'Informe o bruto para o dízimo ser calculado automaticamente.';
  });

  async salvar(): Promise<void> {
    this.store.fechar();
    await this.store.salvarRenda({
      bruto: parseValor(this.bruto()), liquido: parseValor(this.liquido()),
      extra: parseValor(this.extra()), extraObs: this.obs.trim(),
    });
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancasStore } from '../core/financas.store';
import { brl, keyLabel, parseValor } from '../core/format';

const paraCampo = (v?: number) => (v ? String(v).replace('.', ',') : '');

@Component({
  selector: 'app-modal-renda',
  imports: [FormsModule],
  template: `
    <h2>Renda de {{ titulo }}</h2>
    <form class="form" (ngSubmit)="salvar()">
      <div class="field"><label for="rBruto">Salário bruto (R$)</label>
        <input id="rBruto" name="bruto" inputmode="decimal" [ngModel]="bruto()" (ngModelChange)="bruto.set($event)"></div>
      <div class="field"><label for="rLiq">Salário líquido (R$)</label>
        <input id="rLiq" name="liquido" inputmode="decimal" [ngModel]="liquido()" (ngModelChange)="liquido.set($event)"></div>
      <div class="field"><label for="rExtra">Extra (R$)</label>
        <input id="rExtra" name="extra" inputmode="decimal" [ngModel]="extra()" (ngModelChange)="extra.set($event)"></div>
      <div class="field"><label for="rObs">De onde veio o extra</label>
        <input id="rObs" name="obs" [(ngModel)]="obs" placeholder="Ex.: venda, serviço"></div>
      <p class="hint full" style="margin:0">{{ dica() }}</p>
      <button type="submit" hidden></button>
    </form>
    <div class="actions"><span class="sp"></span>
      <button class="btn" (click)="store.fechar()">Cancelar</button>
      <button class="btn primary" (click)="salvar()">Salvar renda</button>
    </div>
  `,
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

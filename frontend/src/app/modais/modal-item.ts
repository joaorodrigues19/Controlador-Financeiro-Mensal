import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancasStore } from '../core/financas.store';
import { TIPOS, brl, keyAdd, keyLabel, parseValor } from '../core/format';
import { Lancamento, Status, Tipo } from '../core/models';
import { ToastService } from '../core/toast.service';

const NOVA_CAT = '__nova';

@Component({
  selector: 'app-modal-item',
  imports: [FormsModule],
  template: `
    <h2>{{ it ? 'Editar lançamento' : 'Novo lançamento' }} · {{ titulo }}</h2>
    <form class="form" (ngSubmit)="salvar()" autocomplete="off">
      <div class="field full"><label for="iItem">Descrição</label>
        <input id="iItem" name="item" [(ngModel)]="item" required placeholder="Ex.: Mercado, Uber, Farmácia"></div>
      <div class="field"><label for="iValor">{{ it ? 'Valor (R$)' : 'Valor total (R$)' }}</label>
        <input id="iValor" name="valor" inputmode="decimal" [ngModel]="valor()" (ngModelChange)="valor.set($event)"
               [disabled]="!!it?.auto" placeholder="0,00"></div>
      <div class="field"><label for="iDia">Dia do vencimento</label>
        <input id="iDia" name="dia" type="number" min="1" max="31" [(ngModel)]="dia"></div>
      <div class="field full"><label for="iForma">Forma de pagamento</label>
        <select id="iForma" name="forma" [(ngModel)]="cartao">
          <option value="">Pix, débito ou dinheiro</option>
          <option value="Nubank">Cartão Nubank (entra na fatura)</option>
        </select></div>
      <div class="field full"><label for="iCat">Categoria</label>
        <select id="iCat" name="cat" [ngModel]="cat()" (ngModelChange)="cat.set($event)">
          @for (c of categorias(); track c) { <option [value]="c">{{ c }}</option> }
          <option [value]="novaCat">+ Nova categoria…</option>
        </select></div>
      @if (cat() === novaCat) {
        <div class="field full"><label for="iNovaCat">Nome da nova categoria</label>
          <input id="iNovaCat" name="novaCat" [(ngModel)]="nomeNovaCat"></div>
      }
      <div class="field full"><label>Tipo</label>
        <div class="seg">
          @for (t of tipos; track t) {
            <button type="button" [attr.aria-pressed]="tipo() === t" (click)="tipo.set(t)">{{ t }}</button>
          }
        </div></div>
      @if (!it && tipo() === 'Parcelado') {
        <div class="field full"><label for="iParc">Em quantas vezes?</label>
          <input id="iParc" name="parc" type="number" min="2" max="48" [ngModel]="parcelas()" (ngModelChange)="parcelas.set(+$event)">
          <span class="hint">{{ dicaParcelas() }}</span></div>
      }
      <div class="field full"><label>Status</label>
        <div class="seg">
          @for (s of statusOpcoes; track s) {
            <button type="button" [attr.aria-pressed]="status === s" (click)="status = s">{{ s }}</button>
          }
        </div></div>
      @if (it?.parc) {
        <label class="check full"><input type="checkbox" name="futuras" [(ngModel)]="futuras"> Aplicar exclusão também às próximas parcelas</label>
      }
      @if (it?.auto) {
        <p class="hint full" style="margin:0">O dízimo é calculado como 10% do salário bruto. Para mudar o valor, edite a renda do mês.</p>
      }
      <button type="submit" hidden></button>
    </form>
    <div class="actions">
      @if (it) {
        <button class="btn danger" [class.armed]="armado()" (click)="excluir()">{{ armado() ? 'Confirmar exclusão' : 'Excluir' }}</button>
      }
      <span class="sp"></span>
      <button class="btn" (click)="store.fechar()">Cancelar</button>
      <button class="btn primary" (click)="salvar()">Salvar</button>
    </div>
  `,
})
export class ModalItem {
  protected store = inject(FinancasStore);
  private toast = inject(ToastService);
  readonly id = input<string | null>(null);

  protected tipos = TIPOS;
  protected statusOpcoes: Status[] = ['Pago', 'Pendente'];
  protected novaCat = NOVA_CAT;
  protected titulo = keyLabel(this.store.cur(), true);

  protected it: Lancamento | null = null;
  protected item = '';
  protected valor = signal('');
  protected dia = new Date().getDate();
  protected cartao = '';
  protected cat = signal('Compras');
  protected nomeNovaCat = '';
  protected tipo = signal<Tipo>('Eventual');
  protected status: Status = 'Pago';
  protected parcelas = signal(2);
  protected futuras = false;
  protected armado = signal(false);

  protected categorias = computed(() => {
    const base = this.store.categorias();
    return this.it && !base.includes(this.it.cat) ? [...base, this.it.cat] : base;
  });

  protected dicaParcelas = computed(() => {
    const n = this.parcelas(), v = parseValor(this.valor()), k = this.store.cur();
    return n > 1 && v ? `${n}× de ${brl(v / n)} de ${keyLabel(k, true)} a ${keyLabel(keyAdd(k, n - 1), true)}` : '';
  });

  ngOnInit(): void {
    const id = this.id();
    this.it = id ? this.store.mes(this.store.cur())?.itens.find(i => i.id === id) ?? null : null;
    if (this.it) {
      this.item = this.it.item;
      this.valor.set(String(this.it.valor).replace('.', ','));
      this.dia = this.it.dia;
      this.cartao = this.it.cartao ?? '';
      this.cat.set(this.it.cat);
      this.tipo.set(this.it.tipo);
      this.status = this.it.status;
    }
  }

  async salvar(): Promise<void> {
    const item = this.item.trim(), valor = parseValor(this.valor());
    const dia = Math.min(31, Math.max(1, Math.trunc(+this.dia) || 1));
    let cat = this.cat();
    if (!item) return this.toast.mostrar('Informe a descrição');
    if (!(valor > 0) && !this.it?.auto) return this.toast.mostrar('Informe um valor maior que zero');
    if (cat === NOVA_CAT) {
      cat = this.nomeNovaCat.trim();
      if (!cat) return this.toast.mostrar('Dê um nome para a categoria');
      await this.store.novaCategoria(cat);
    }
    const dados = { item, valor, cat, tipo: this.tipo(), dia, status: this.status, cartao: this.cartao || null };
    this.store.fechar();
    if (this.it) await this.store.atualizarItem(this.it.id, dados);
    else await this.store.criarItem({ ...dados, parcelas: Math.max(2, Math.min(48, this.parcelas() || 2)) });
  }

  async excluir(): Promise<void> {
    if (!this.armado()) return this.armado.set(true);
    this.store.fechar();
    await this.store.excluir(this.it!, this.futuras);
  }
}

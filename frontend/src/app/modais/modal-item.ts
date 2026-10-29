import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinancasStore } from '../core/state/financas.store';
import { TIPOS, brl, keyAdd, keyLabel, parseValor } from '../core/domain/financas.calc';
import { Lancamento, Status, Tipo } from '../core/domain/models';
import { ToastService } from '../core/ui/toast.service';

const NOVA_CAT = '__nova';

@Component({
  selector: 'app-modal-item',
  imports: [FormsModule],
  templateUrl: './modal-item.html',
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

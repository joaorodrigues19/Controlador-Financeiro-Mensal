import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { FinancasApi } from '../api/financas.api';
import { mensagemErro } from '../api/http-erro';
import { keyAdd, keyLabel, todayKey } from '../domain/financas.calc';
import { AtualizaLancamento, Lancamento, Mes, NovoLancamento, Perfil, Renda } from '../domain/models';
import { ToastService } from '../ui/toast.service';

export type Modal = { tipo: 'renda' } | { tipo: 'item'; id: string | null } | null;

export interface Filtros { q: string; cat: string; tipo: string; status: string; cartao: string }
export const SEM_FILTROS: Filtros = { q: '', cat: '', tipo: '', status: '', cartao: '' };

/** Estado do app (meses, perfil, mês selecionado, modal e filtros) e as ações que o alteram pela API. */
@Injectable({ providedIn: 'root' })
export class FinancasStore {
  private api = inject(FinancasApi);
  private toast = inject(ToastService);

  readonly meses = signal<Record<string, Mes>>({});
  readonly perfil = signal<Perfil | null>(null);
  readonly carregado = signal(false);
  readonly erro = signal<string | null>(null);
  readonly cur = signal(todayKey);
  readonly modal = signal<Modal>(null);
  /** Categorias da fatura Nubank abertas no painel. */
  readonly nubAbertas = signal<ReadonlySet<string>>(new Set());
  readonly filtros = signal<Filtros>(SEM_FILTROS);

  readonly chaves = computed(() => Object.keys(this.meses()).sort());
  readonly categorias = computed(() => this.perfil()?.categorias ?? []);

  mes(k: string): Mes | null {
    return this.meses()[k] ?? null;
  }

  async carregar(): Promise<void> {
    try {
      const [lista, perfil] = await Promise.all([firstValueFrom(this.api.meses()), firstValueFrom(this.api.perfil())]);
      this.meses.set(Object.fromEntries(lista.map(m => [m.chave, m])));
      this.perfil.set(perfil);
      this.erro.set(null);
      this.carregado.set(true);
    } catch (e) {
      this.erro.set(mensagemErro(e, 'Não consegui carregar seus dados.'));
    }
  }

  abrir(m: Modal): void {
    this.modal.set(m);
  }

  fechar(): void {
    this.modal.set(null);
  }

  salvarRenda(r: Renda): Promise<unknown> {
    return this.alterar(this.api.salvarRenda(this.cur(), r), 'Renda salva');
  }

  /** Alterna pago/pendente de um lançamento, ou da fatura Nubank inteira quando o id é "__nub". */
  async alternarPagamento(id: string): Promise<void> {
    const k = this.cur();
    if (id === '__nub') {
      const r = await this.alterar(this.api.alternarFatura(k, 'Nubank'));
      if (r) this.toast.mostrar(r.status === 'Pago' ? 'Fatura Nubank marcada como paga' : 'Fatura Nubank voltou para pendente');
      return;
    }
    const it = this.mes(k)?.itens.find(i => i.id === id);
    if (!it) return;
    await this.alterar(this.api.alternarPagamento(k, id),
      it.status === 'Pago' ? `${it.item} voltou para pendente` : `${it.item} marcado como pago`);
  }

  async copiarAnterior(): Promise<void> {
    const k = this.cur(), anterior = keyAdd(k, -1);
    if (!this.mes(anterior)) {
      this.toast.mostrar('Não há mês anterior lançado');
      return;
    }
    const r = await this.alterar(this.api.copiarAnterior(k));
    if (r) this.toast.mostrar(r.quantidade ? `${r.quantidade} contas trazidas de ${keyLabel(anterior, true)}` : 'Nada novo para trazer');
  }

  criarItem(req: NovoLancamento): Promise<unknown> {
    const k = this.cur(), n = req.tipo === 'Parcelado' ? req.parcelas : 1;
    return this.alterar(this.api.criarItem(k, req),
      n > 1 ? `Parcelado em ${n}× lançado até ${keyLabel(keyAdd(k, n - 1), true)}` : 'Lançamento salvo');
  }

  atualizarItem(id: string, req: AtualizaLancamento): Promise<unknown> {
    return this.alterar(this.api.atualizarItem(this.cur(), id, req), 'Lançamento atualizado');
  }

  async excluir(it: Lancamento, futuras: boolean): Promise<void> {
    const r = await this.alterar(this.api.excluir(this.cur(), it.id, futuras));
    if (r) {
      const n = r.quantidade;
      this.toast.mostrar(n ? `Excluído junto com ${n} parcela${n > 1 ? 's' : ''} futura${n > 1 ? 's' : ''}` : 'Lançamento excluído');
    }
  }

  /** Acrescenta uma categoria criada no formulário à lista do usuário. */
  async novaCategoria(nome: string): Promise<void> {
    const atuais = this.categorias();
    if (atuais.includes(nome)) return;
    try {
      this.perfil.set(await firstValueFrom(this.api.salvarCategorias([...atuais, nome])));
    } catch (e) {
      this.toast.mostrar(mensagemErro(e, 'Não consegui salvar a categoria.'));
    }
  }

  limpar(): void {
    this.meses.set({});
    this.perfil.set(null);
    this.carregado.set(false);
    this.cur.set(todayKey);
    this.modal.set(null);
    this.filtros.set(SEM_FILTROS);
  }

  /** Envia a alteração, recarrega os meses e mostra a mensagem; devolve a resposta, ou undefined se falhou. */
  private async alterar<T>(req: Observable<T>, ok?: string): Promise<T | undefined> {
    try {
      const r = await firstValueFrom(req);
      await this.carregar();
      if (ok) this.toast.mostrar(ok);
      return r;
    } catch (e) {
      this.toast.mostrar(mensagemErro(e, 'Não consegui salvar. Tente de novo.'));
      return undefined;
    }
  }
}

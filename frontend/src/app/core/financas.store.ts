import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { mensagemErro } from './auth.service';
import { keyAdd, keyLabel, todayKey } from './format';
import { Lancamento, Mes, Perfil, Status, Tipo } from './models';
import { ToastService } from './toast.service';

export type Modal = { tipo: 'renda' } | { tipo: 'item'; id: string | null } | null;

export interface Filtros { q: string; cat: string; tipo: string; status: string; cartao: string }
export const SEM_FILTROS: Filtros = { q: '', cat: '', tipo: '', status: '', cartao: '' };

export interface NovoLancamento {
  item: string; valor: number; cat: string; tipo: Tipo; dia: number; status: Status; cartao: string | null; parcelas: number;
}
export type AtualizaLancamento = Omit<NovoLancamento, 'parcelas'>;

/** Estado do app: todos os meses do usuário, o mês selecionado e o perfil. */
@Injectable({ providedIn: 'root' })
export class FinancasStore {
  private http = inject(HttpClient);
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
      const [lista, perfil] = await Promise.all([
        firstValueFrom(this.http.get<Mes[]>('/api/meses')),
        firstValueFrom(this.http.get<Perfil>('/api/perfil')),
      ]);
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

  salvarRenda(r: { bruto: number; liquido: number; extra: number; extraObs: string }): Promise<unknown> {
    return this.alterar(firstValueFrom(this.http.put(`/api/meses/${this.cur()}/renda`, r)), 'Renda salva');
  }

  /** Alterna pago/pendente de um lançamento, ou da fatura Nubank inteira quando o id é "__nub". */
  async alternarPagamento(id: string): Promise<void> {
    const k = this.cur();
    if (id === '__nub') {
      const r = await this.alterar(firstValueFrom(this.http.post<{ status: string }>(`/api/meses/${k}/faturas/Nubank/pagamento`, {})));
      if (r) this.toast.mostrar(r.status === 'Pago' ? 'Fatura Nubank marcada como paga' : 'Fatura Nubank voltou para pendente');
      return;
    }
    const it = this.mes(k)?.itens.find(i => i.id === id);
    if (!it) return;
    await this.alterar(firstValueFrom(this.http.post(`/api/meses/${k}/itens/${id}/pagamento`, {})),
      it.status === 'Pago' ? `${it.item} voltou para pendente` : `${it.item} marcado como pago`);
  }

  async copiarAnterior(): Promise<void> {
    const k = this.cur(), anterior = keyAdd(k, -1);
    if (!this.mes(anterior)) {
      this.toast.mostrar('Não há mês anterior lançado');
      return;
    }
    const r = await this.alterar(firstValueFrom(this.http.post<{ quantidade: number }>(`/api/meses/${k}/copiar-anterior`, {})));
    if (r) this.toast.mostrar(r.quantidade ? `${r.quantidade} contas trazidas de ${keyLabel(anterior, true)}` : 'Nada novo para trazer');
  }

  criarItem(req: NovoLancamento): Promise<unknown> {
    const k = this.cur(), n = req.tipo === 'Parcelado' ? req.parcelas : 1;
    return this.alterar(firstValueFrom(this.http.post(`/api/meses/${k}/itens`, req)),
      n > 1 ? `Parcelado em ${n}× lançado até ${keyLabel(keyAdd(k, n - 1), true)}` : 'Lançamento salvo');
  }

  atualizarItem(id: string, req: AtualizaLancamento): Promise<unknown> {
    return this.alterar(firstValueFrom(this.http.put(`/api/meses/${this.cur()}/itens/${id}`, req)), 'Lançamento atualizado');
  }

  async excluir(it: Lancamento, futuras: boolean): Promise<void> {
    const r = await this.alterar(firstValueFrom(
      this.http.delete<{ quantidade: number }>(`/api/meses/${this.cur()}/itens/${it.id}`, { params: { futuras } })));
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
      this.perfil.set(await firstValueFrom(this.http.put<Perfil>('/api/perfil/categorias', [...atuais, nome])));
    } catch (e) {
      this.toast.mostrar(mensagemErro(e, 'Não consegui salvar a categoria.'));
    }
  }

  /** Executa uma alteração na API e recarrega os meses; devolve a resposta ou undefined se falhou. */
  protected async alterar<T>(req: Promise<T>, ok?: string): Promise<T | undefined> {
    try {
      const r = await req;
      await this.carregar();
      if (ok) this.toast.mostrar(ok);
      return r;
    } catch (e) {
      this.toast.mostrar(mensagemErro(e, 'Não consegui salvar. Tente de novo.'));
      return undefined;
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
}

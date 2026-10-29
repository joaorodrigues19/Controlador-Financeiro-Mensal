import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { mensagemErro } from './auth.service';
import { todayKey } from './format';
import { Mes, Perfil } from './models';
import { ToastService } from './toast.service';

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
  }
}

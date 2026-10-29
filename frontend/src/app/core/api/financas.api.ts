import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AtualizaLancamento, Mes, NovoLancamento, Perfil, Renda, Status } from '../domain/models';

interface Contagem {
  quantidade: number;
}

/** Rotas autenticadas de perfil e meses: /api/perfil e /api/meses/{AAAA-MM}. */
@Injectable({ providedIn: 'root' })
export class FinancasApi {
  private http = inject(HttpClient);

  perfil(): Observable<Perfil> {
    return this.http.get<Perfil>('/api/perfil');
  }

  salvarCategorias(categorias: string[]): Observable<Perfil> {
    return this.http.put<Perfil>('/api/perfil/categorias', categorias);
  }

  meses(): Observable<Mes[]> {
    return this.http.get<Mes[]>('/api/meses');
  }

  salvarRenda(chave: string, renda: Renda): Observable<void> {
    return this.http.put<void>(`/api/meses/${chave}/renda`, renda);
  }

  criarItem(chave: string, req: NovoLancamento): Observable<void> {
    return this.http.post<void>(`/api/meses/${chave}/itens`, req);
  }

  atualizarItem(chave: string, id: string, req: AtualizaLancamento): Observable<void> {
    return this.http.put<void>(`/api/meses/${chave}/itens/${id}`, req);
  }

  alternarPagamento(chave: string, id: string): Observable<void> {
    return this.http.post<void>(`/api/meses/${chave}/itens/${id}/pagamento`, {});
  }

  alternarFatura(chave: string, cartao: string): Observable<{ status: Status }> {
    return this.http.post<{ status: Status }>(`/api/meses/${chave}/faturas/${encodeURIComponent(cartao)}/pagamento`, {});
  }

  /** Exclui o lançamento; com {@code futuras}, também as próximas parcelas. Devolve quantos meses futuros mudaram. */
  excluir(chave: string, id: string, futuras: boolean): Observable<Contagem> {
    return this.http.delete<Contagem>(`/api/meses/${chave}/itens/${id}`, { params: { futuras } });
  }

  /** Traz as contas recorrentes do mês anterior. Devolve quantas foram trazidas. */
  copiarAnterior(chave: string): Observable<Contagem> {
    return this.http.post<Contagem>(`/api/meses/${chave}/copiar-anterior`, {});
  }
}

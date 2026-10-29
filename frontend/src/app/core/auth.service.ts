import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { Perfil } from './models';

const CHAVE_TOKEN = 'fin.token';

interface TokenResponse { token: string; perfil: Perfil }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(lerToken());
  readonly logado = computed(() => !!this.token());

  async entrar(email: string, senha: string): Promise<void> {
    this.guardar(await firstValueFrom(this.http.post<TokenResponse>('/api/auth/login', { email, senha })));
  }

  async cadastrar(nome: string, email: string, senha: string): Promise<void> {
    this.guardar(await firstValueFrom(this.http.post<TokenResponse>('/api/auth/cadastro', { nome, email, senha })));
  }

  sair(): void {
    try { localStorage.removeItem(CHAVE_TOKEN); } catch { /* armazenamento indisponível */ }
    this.token.set(null);
    this.router.navigateByUrl('/entrar');
  }

  private guardar(r: TokenResponse): void {
    try { localStorage.setItem(CHAVE_TOKEN, r.token); } catch { /* armazenamento indisponível */ }
    this.token.set(r.token);
  }
}

function lerToken(): string | null {
  try { return localStorage.getItem(CHAVE_TOKEN); } catch { return null; }
}

/** Envia o token em toda chamada à API e volta para o login quando ele expira. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const r = token && !req.url.startsWith('/api/auth/') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(r).pipe(catchError((e: HttpErrorResponse) => {
    if (e.status === 401 && token) auth.sair();
    return throwError(() => e);
  }));
};

export const authGuard: CanActivateFn = () => inject(AuthService).logado() || inject(Router).parseUrl('/entrar');
export const visitanteGuard: CanActivateFn = () => !inject(AuthService).logado() || inject(Router).parseUrl('/');

/** Extrai a mensagem de erro que o Spring devolve. */
export function mensagemErro(e: unknown, padrao = 'Não consegui falar com o servidor. Tente de novo.'): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0 || e.status === 502 || e.status === 504) return 'Servidor fora do ar. Confira se o back-end está rodando.';
    const m = e.error?.message ?? e.error?.detail;
    if (typeof m === 'string' && m && !m.startsWith('Validation failed')) return m;
    if (e.status === 400) return 'Confira os dados informados.';
  }
  return padrao;
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi, TokenResponse } from '../api/auth.api';

const CHAVE_TOKEN = 'fin.token';

/** Guarda o token JWT da sessão e faz entrar, cadastrar e sair. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(AuthApi);
  private router = inject(Router);

  readonly token = signal<string | null>(lerToken());
  readonly logado = computed(() => !!this.token());

  async entrar(email: string, senha: string): Promise<void> {
    this.guardar(await firstValueFrom(this.api.login(email, senha)));
  }

  async cadastrar(nome: string, email: string, senha: string): Promise<void> {
    this.guardar(await firstValueFrom(this.api.cadastro(nome, email, senha)));
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

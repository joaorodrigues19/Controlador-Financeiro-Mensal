import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Perfil } from '../domain/models';

export interface TokenResponse {
  token: string;
  perfil: Perfil;
}

/** Rotas públicas de autenticação: /api/auth. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private http = inject(HttpClient);

  login(email: string, senha: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/login', { email, senha });
  }

  cadastro(nome: string, email: string, senha: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/cadastro', { nome, email, senha });
  }
}

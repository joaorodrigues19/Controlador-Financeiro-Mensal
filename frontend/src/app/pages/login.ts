import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, mensagemErro } from '../core/auth.service';
import { MarcaIcone } from '../layout/marca-icone';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MarcaIcone],
  template: `
    <div class="lock page">
      <div class="lockbox">
        <div class="mark mark-lg" aria-hidden="true"><app-marca-icone [tamanho]="34" /></div>
        <div class="lockbrand">Controle Financeiro</div>
        <h1>{{ modo() === 'entrar' ? 'Entre na sua conta' : 'Crie sua conta' }}</h1>

        <form class="loginform" (ngSubmit)="enviar()" autocomplete="on">
          <div class="seg" role="group" aria-label="Entrar ou criar conta">
            <button type="button" [attr.aria-pressed]="modo() === 'entrar'" (click)="trocar('entrar')">Entrar</button>
            <button type="button" [attr.aria-pressed]="modo() === 'cadastro'" (click)="trocar('cadastro')">Criar conta</button>
          </div>
          @if (modo() === 'cadastro') {
            <div class="field"><label for="lNome">Nome</label>
              <input id="lNome" name="nome" [(ngModel)]="nome" autocomplete="name" required></div>
          }
          <div class="field"><label for="lEmail">E-mail</label>
            <input id="lEmail" name="email" type="email" [(ngModel)]="email" autocomplete="email" required></div>
          <div class="field"><label for="lSenha">Senha</label>
            <input id="lSenha" name="senha" type="password" [(ngModel)]="senha" required
                   [attr.autocomplete]="modo() === 'entrar' ? 'current-password' : 'new-password'"></div>
          @if (modo() === 'cadastro') {
            <span class="hint">Mínimo de 6 caracteres.</span>
          }
          <div class="err" role="alert">{{ erro() }}</div>
          <button class="btn primary" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Aguarde…' : modo() === 'entrar' ? 'Entrar' : 'Criar conta' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly modo = signal<'entrar' | 'cadastro'>('entrar');
  readonly erro = signal('');
  readonly enviando = signal(false);
  nome = '';
  email = '';
  senha = '';

  trocar(m: 'entrar' | 'cadastro'): void {
    this.modo.set(m);
    this.erro.set('');
  }

  async enviar(): Promise<void> {
    const cadastro = this.modo() === 'cadastro';
    if (cadastro && !this.nome.trim()) return this.erro.set('Informe seu nome');
    if (!this.email.trim() || !this.senha) return this.erro.set('Informe e-mail e senha');
    if (cadastro && this.senha.length < 6) return this.erro.set('A senha precisa ter pelo menos 6 caracteres');
    this.enviando.set(true);
    this.erro.set('');
    try {
      if (cadastro) await this.auth.cadastrar(this.nome.trim(), this.email.trim(), this.senha);
      else await this.auth.entrar(this.email.trim(), this.senha);
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}

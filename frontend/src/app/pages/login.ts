import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { mensagemErro } from '../core/api/http-erro';
import { AuthService } from '../core/auth/auth.service';
import { MarcaIcone } from '../layout/marca-icone';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MarcaIcone],
  templateUrl: './login.html',
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

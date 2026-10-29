import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly mensagem = signal<string | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  mostrar(msg: string): void {
    this.mensagem.set(msg);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.mensagem.set(null), 2600);
  }
}

import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { FinancasStore } from '../core/state/financas.store';
import { keyAdd, keyLabel } from '../core/domain/financas.calc';
import { ToastService } from '../core/ui/toast.service';
import { ModalHost } from '../modais/modal-host';
import { MarcaIcone } from './marca-icone';

/** Cabeçalho com seletor de mês, abas (topo no desktop, barra inferior no celular), tooltip e toast. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MarcaIcone, ModalHost],
  templateUrl: './shell.html',
})
export class Shell implements OnInit {
  protected store = inject(FinancasStore);
  protected toast = inject(ToastService);
  private auth = inject(AuthService);
  private router = inject(Router);

  private url = toSignal(this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url });
  protected aba = computed(() => (this.url().startsWith('/visao-geral') ? 'ano' : 'mes'));
  private largura = signal(innerWidth);
  protected rotuloMes = computed(() => (this.aba() === 'ano' ? this.store.cur().slice(0, 4) : keyLabel(this.store.cur(), this.largura() > 500)));
  protected tip = signal<{ html: string; x: number; y: number } | null>(null);

  ngOnInit(): void {
    if (!this.store.carregado()) this.store.carregar();
  }

  passo(dir: number): void {
    this.store.cur.update(k => keyAdd(k, dir * (this.aba() === 'ano' ? 12 : 1)));
  }

  sair(): void {
    this.store.limpar();
    this.auth.sair();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.largura.set(innerWidth);
  }

  /** Qualquer elemento com data-tip mostra o tooltip ao passar o mouse. */
  @HostListener('document:pointermove', ['$event'])
  onPointer(e: PointerEvent): void {
    const alvo = (e.target as Element | null)?.closest?.('[data-tip]') as HTMLElement | null;
    if (!alvo) {
      if (this.tip()) this.tip.set(null);
      return;
    }
    const w = 190, h = 90;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    this.tip.set({ html: alvo.dataset['tip'] ?? '', x, y });
  }

  @HostListener('document:scroll')
  onScroll(): void {
    this.tip.set(null);
  }
}

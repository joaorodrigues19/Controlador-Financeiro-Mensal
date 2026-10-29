import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { FinancasStore } from '../core/financas.store';
import { keyAdd, keyLabel } from '../core/format';
import { ToastService } from '../core/toast.service';
import { MarcaIcone } from './marca-icone';

/** Cabeçalho com seletor de mês, abas (topo no desktop, barra inferior no celular), tooltip e toast. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MarcaIcone],
  template: `
    <header>
      <div class="wrap bar">
        <div class="brand"><div class="mark" aria-hidden="true"><app-marca-icone /></div><span>Controle Financeiro</span></div>
        <div class="tabs top" role="tablist">
          <a class="tab" routerLink="/visao-geral" [attr.aria-selected]="aba() === 'ano'">Visão geral</a>
          <a class="tab" routerLink="/painel" [attr.aria-selected]="aba() !== 'ano'">Painel</a>
        </div>
        <div class="month">
          <button class="ibtn" (click)="passo(-1)" [attr.aria-label]="aba() === 'ano' ? 'Ano anterior' : 'Mês anterior'">‹</button>
          <b>{{ rotuloMes() }}</b>
          <button class="ibtn" (click)="passo(1)" [attr.aria-label]="aba() === 'ano' ? 'Próximo ano' : 'Próximo mês'">›</button>
          <button class="ibtn lockbtn" (click)="sair()" aria-label="Sair" title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          </button>
        </div>
      </div>
    </header>

    <main class="wrap">
      @if (store.erro(); as erro) {
        <div class="card"><div class="empty">{{ erro }}<div class="actions" style="justify-content:center">
          <button class="btn" (click)="store.carregar()">Tentar de novo</button></div></div></div>
      } @else if (!store.carregado()) {
        <div class="card"><div class="empty">Carregando…</div></div>
      } @else {
        <router-outlet />
      }
    </main>

    <nav class="bottom" role="tablist">
      <a class="tab" routerLink="/visao-geral" [attr.aria-selected]="aba() === 'ano'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>Visão geral</a>
      <a class="tab" routerLink="/painel" [attr.aria-selected]="aba() !== 'ano'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>Painel</a>
    </nav>

    <div class="tip" [hidden]="!tip()" [innerHTML]="tip()?.html ?? ''" [style.left.px]="tip()?.x" [style.top.px]="tip()?.y"></div>
    @if (toast.mensagem(); as msg) { <div class="toast" role="status">{{ msg }}</div> }
  `,
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

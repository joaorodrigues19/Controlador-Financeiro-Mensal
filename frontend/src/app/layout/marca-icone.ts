import { Component, input } from '@angular/core';

/** Ícone da nota de dinheiro usado na marca do app. */
@Component({
  selector: 'app-marca-icone',
  template: `
    <svg [attr.width]="tamanho()" [attr.height]="tamanho()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M12 8.6v6.8M14 10.1c-.35-.7-1.1-1-1.95-1-1.05 0-1.85.55-1.85 1.35 0 1.8 3.9 1 3.9 2.8 0 .8-.8 1.4-1.95 1.4-.95 0-1.75-.45-2.05-1.15"/>
      <path d="M5.5 12h.01M18.5 12h.01"/>
    </svg>
  `,
  styles: `:host{display:contents}`,
})
export class MarcaIcone {
  readonly tamanho = input(18);
}

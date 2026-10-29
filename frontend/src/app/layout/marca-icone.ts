import { Component, input } from '@angular/core';

/** Ícone da nota de dinheiro usado na marca do app. */
@Component({
  selector: 'app-marca-icone',
  templateUrl: './marca-icone.html',
  styles: `:host{display:contents}`,
})
export class MarcaIcone {
  readonly tamanho = input(18);
}

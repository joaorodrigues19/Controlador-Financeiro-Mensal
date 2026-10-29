import { HttpErrorResponse } from '@angular/common/http';

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

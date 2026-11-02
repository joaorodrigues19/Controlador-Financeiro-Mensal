import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinancasStore } from '../core/state/financas.store';

/** Categoria do dízimo automático, criada pelo back-end a cada mês com renda bruta. */
const CAT_DIZIMO = 'Fé';

interface LinhaCategoria {
  nome: string;
  /** Lançamentos com essa categoria, somando todos os meses. */
  n: number;
  /** Usada em lançamentos, mas fora da lista (sobrou de uma exclusão antiga). */
  avulsa: boolean;
}

type Edicao = { nome: string; modo: 'renomear' | 'excluir' } | null;

@Component({
  selector: 'app-categorias',
  imports: [FormsModule],
  templateUrl: './categorias.html',
})
export class Categorias {
  protected store = inject(FinancasStore);
  private router = inject(Router);
  protected catDizimo = CAT_DIZIMO;

  protected nova = '';
  protected edicao = signal<Edicao>(null);
  protected texto = '';
  protected destino = '';
  protected armado = signal(false);
  protected salvando = signal(false);

  protected linhas = computed<LinhaCategoria[]>(() => {
    const uso = new Map<string, number>();
    for (const m of Object.values(this.store.meses())) {
      for (const i of m.itens) uso.set(i.cat, (uso.get(i.cat) ?? 0) + 1);
    }
    const lista = this.store.categorias();
    const avulsas = [...uso.keys()].filter(c => !lista.includes(c)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [
      ...lista.map(nome => ({ nome, n: uso.get(nome) ?? 0, avulsa: false })),
      ...avulsas.map(nome => ({ nome, n: uso.get(nome) ?? 0, avulsa: true })),
    ];
  });

  /** Nome digitado no "renomear" que já é de outra categoria: salvar junta as duas. */
  protected juntaCom(atual: string): string | null {
    const t = this.texto.trim();
    return t && t !== atual && this.linhas().some(l => l.nome === t) ? t : null;
  }

  protected outras(atual: string): string[] {
    return this.store.categorias().filter(c => c !== atual);
  }

  protected rotuloUso(n: number): string {
    return n ? `${n} lançamento${n > 1 ? 's' : ''}` : 'sem lançamentos';
  }

  async adicionar(): Promise<void> {
    const nome = this.nova.trim();
    if (!nome) return;
    if (this.store.categorias().includes(nome)) {
      this.nova = '';
      return;
    }
    if (await this.store.salvarCategorias([...this.store.categorias(), nome], `Categoria ${nome} criada`)) this.nova = '';
  }

  mover(nome: string, dir: number): void {
    const lista = [...this.store.categorias()], i = lista.indexOf(nome), j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.store.salvarCategorias(lista);
  }

  editar(l: LinhaCategoria, modo: 'renomear' | 'excluir'): void {
    const mesma = this.edicao();
    if (mesma?.nome === l.nome && mesma.modo === modo) {
      this.cancelar();
      return;
    }
    this.edicao.set({ nome: l.nome, modo });
    this.texto = l.nome;
    this.destino = this.outras(l.nome).includes('Outros') ? 'Outros' : (this.outras(l.nome)[0] ?? '');
    this.armado.set(false);
  }

  cancelar(): void {
    this.edicao.set(null);
    this.armado.set(false);
  }

  async renomear(l: LinhaCategoria): Promise<void> {
    const para = this.texto.trim();
    if (!para || para === l.nome) {
      this.cancelar();
      return;
    }
    const junta = this.juntaCom(l.nome);
    await this.executar(this.store.renomearCategoria(l.nome, para, n =>
      junta ? `${l.nome} juntada com ${para}${n ? ` · ${this.rotuloUso(n)} movidos` : ''}`
        : `Renomeada para ${para}${n ? ` · ${this.rotuloUso(n)} atualizados` : ''}`));
  }

  async excluir(l: LinhaCategoria): Promise<void> {
    if (l.n) {
      if (!this.destino) return;
      await this.executar(this.store.renomearCategoria(l.nome, this.destino, n =>
        `${l.nome} excluída · ${this.rotuloUso(n)} movidos para ${this.destino}`));
      return;
    }
    if (!this.armado()) {
      this.armado.set(true);
      return;
    }
    await this.executar(this.store.salvarCategorias(this.store.categorias().filter(c => c !== l.nome), `${l.nome} excluída`));
  }

  voltar(): void {
    this.router.navigateByUrl('/painel');
  }

  private async executar(acao: Promise<boolean>): Promise<void> {
    this.salvando.set(true);
    try {
      if (await acao) this.cancelar();
    } finally {
      this.salvando.set(false);
    }
  }
}

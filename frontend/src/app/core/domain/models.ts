export type Tipo = 'Fixo' | 'Variável' | 'Parcelado' | 'Eventual';
export type Status = 'Pago' | 'Pendente';

export interface Lancamento {
  id: string;
  item: string;
  cat: string;
  tipo: Tipo;
  valor: number;
  dia: number;
  status: Status;
  cartao?: string | null;
  parc?: string | null;
  grupo?: string | null;
  auto?: boolean;
  /** Linha agrupada da fatura do cartão (não existe no back-end). */
  synthetic?: boolean;
  n?: number;
}

export interface Mes {
  chave: string;
  bruto: number;
  liquido: number;
  extra: number;
  extraObs?: string | null;
  itens: Lancamento[];
}

export interface Perfil {
  nome: string;
  email: string;
  categorias: string[];
}

export interface Renda {
  bruto: number;
  liquido: number;
  extra: number;
  extraObs: string;
}

/** Dados de um lançamento enviados à API; em um Parcelado, {@link NovoLancamento.valor} é o total da compra. */
export interface AtualizaLancamento {
  item: string;
  valor: number;
  cat: string;
  tipo: Tipo;
  dia: number;
  status: Status;
  cartao: string | null;
}

export interface NovoLancamento extends AtualizaLancamento {
  parcelas: number;
}

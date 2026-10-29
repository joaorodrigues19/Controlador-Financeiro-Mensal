import { Lancamento, Mes, Tipo } from './models';

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_L = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const TIPOS: Tipo[] = ['Fixo', 'Variável', 'Parcelado', 'Eventual'];
export const TIPO_COR: Record<string, string> = { Fixo: 'var(--s1)', 'Variável': 'var(--s2)', Parcelado: 'var(--s3)', Eventual: 'var(--s4)' };

export const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl0 = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const pct = (v: number) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0') + '%';
export const r2 = (v: number) => Math.round((+v || 0) * 100) / 100;
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const intBR = (v: number) => Math.round(v).toLocaleString('pt-BR');

/** Converte "1.234,56" ou "1234.56" em número. */
export const parseValor = (s: string | number | null | undefined) =>
  r2(parseFloat(String(s ?? '').replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0);

const hoje = new Date();
export const todayKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

export function keyAdd(k: string, n: number): string {
  let [y, m] = k.split('-').map(Number);
  m += n;
  y += Math.floor((m - 1) / 12);
  m = (((m - 1) % 12) + 12) % 12 + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function keyLabel(k: string, long = false): string {
  const [y, m] = k.split('-').map(Number);
  return long ? `${MESES_L[m - 1]} ${y}` : `${MESES[m - 1]} ${String(y).slice(2)}`;
}

export const renda = (m?: Mes | null) => (m ? r2((m.liquido || 0) + (m.extra || 0)) : 0);
export const total = (m: Mes | null | undefined, fn: (i: Lancamento) => boolean = () => true) =>
  m ? r2(m.itens.filter(fn).reduce((a, i) => a + (+i.valor || 0), 0)) : 0;

export function catTotals(m?: Mes | null): Record<string, number> {
  const o: Record<string, number> = {};
  (m ? m.itens : []).forEach(i => (o[i.cat] = (o[i.cat] || 0) + (+i.valor || 0)));
  return o;
}

export interface ParcInfo { a: number; n: number; falta: number; fim: string; txt: string }

export function parcInfo(k: string, parc?: string | null): ParcInfo | null {
  const mm = /^(\d+)\/(\d+)$/.exec(parc || '');
  if (!mm) return null;
  const a = +mm[1], n = +mm[2], falta = n - a;
  return { a, n, falta, fim: keyLabel(keyAdd(k, falta), true), txt: falta ? `parcela ${a} de ${n} · faltam ${falta}` : `última parcela (${a} de ${n})` };
}

/** Junta as compras do cartão Nubank numa linha só de fatura. */
export function groupNub(list: Lancamento[]): Lancamento[] {
  const nub = list.filter(i => i.cartao === 'Nubank');
  if (!nub.length) return list;
  const g: Lancamento = {
    id: '__nub', item: 'Nubank', cat: 'Cartão', tipo: 'Variável', synthetic: true, n: nub.length, dia: 9,
    valor: r2(nub.reduce((a, i) => a + i.valor, 0)), status: nub.every(i => i.status === 'Pago') ? 'Pago' : 'Pendente',
  };
  return [...list.filter(i => i.cartao !== 'Nubank'), g];
}

export function daysTo(k: string, dia: number): number {
  const [y, mm] = k.split('-').map(Number);
  const d = new Date(y, mm - 1, dia || 1);
  const t = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((d.getTime() - t.getTime()) / 864e5);
}

export const porDia = (a: Lancamento, b: Lancamento) => (a.dia || 99) - (b.dia || 99) || b.valor - a.valor;

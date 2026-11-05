// Bir bütçe ayının nakit akışı toplamları (Genel Bakış kutuları ve küçük grafikler için)
import type { Transaction } from '../types/budget';
import { budgetMonthOf, isCashExpense, shiftMonthKey } from './budgetMonth';
import { convertCurrency } from './currencies';

export interface MonthTotals {
  key: string;
  income: number;
  /** Hesaptan çıkan gider (kartla yapılan alışveriş hariç) */
  expense: number;
  /** Kartla yapılan alışveriş (sonraki ekstreye kalır) */
  card: number;
  saving: number;
  /** Elde kalan: gelir − gider − birikim */
  balance: number;
}

/** cutDay verilirse o ayın yalnızca o güne kadarki işlemleri sayılır (içinde bulunulan ayla adil karşılaştırma) */
export function monthTotals(transactions: Transaction[], key: string, cutDay?: number): MonthTotals {
  let income = 0;
  let expense = 0;
  let card = 0;
  let saving = 0;
  for (const t of transactions) {
    if (budgetMonthOf(t) !== key) continue;
    if (cutDay && t.date.slice(0, 7) === key && Number(t.date.slice(8, 10)) > cutDay) continue;
    const v = convertCurrency(t.amount, t.currency, 'TRY');
    if (t.type === 'income') income += v;
    else if (t.type === 'saving') saving += v;
    else if (isCashExpense(t)) expense += v;
    else card += v;
  }
  return { key, income, expense, card, saving, balance: income - expense - saving };
}

/** endKey dahil son n ay, eskiden yeniye */
export function lastMonths(transactions: Transaction[], endKey: string, n: number): MonthTotals[] {
  return Array.from({ length: n }, (_, i) => monthTotals(transactions, shiftMonthKey(endKey, i - n + 1)));
}

/** Yüzde değişim; önceki değer yoksa null */
export function pctChange(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

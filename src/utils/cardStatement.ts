// Kredi kartı ekstresi: hesap kesim günü gelince o anki borç "ekstre borcu" olur; son ödeme gününe kadar
// ödenmesi gereken tutar budur. Sonraki harcamalar dönem içi harcama olarak bir sonraki ekstreye kalır.
import type { CreditCardAccount } from '../types/budget';
import { monthKeyOf, shiftMonthKey } from './budgetMonth';

// Bugüne göre en son kesilen ekstrenin ayı (YYYY-MM)
export function lastStatementKey(card: Pick<CreditCardAccount, 'statementDay'>, today = new Date()): string {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const day = Math.min(card.statementDay, lastDay);
  const key = monthKeyOf(today);
  return today.getDate() >= day ? key : shiftMonthKey(key, -1);
}

export const statementDebtOf = (card: CreditCardAccount) => card.statementDebt ?? card.currentDebt;

// Dönem içi (henüz ekstreye girmemiş) harcama
export const periodSpendOf = (card: CreditCardAccount) => Math.max(0, card.currentDebt - statementDebtOf(card));

// Asgari ödeme: limiti 100.000 ₺'ye kadar olan kartlarda dönem borcunun %20'si, üstünde %40'ı (banka ekstrelerindeki güncel kural)
export const minimumRateOf = (card: CreditCardAccount) => (card.limit > 100000 ? 0.4 : 0.2);
// Kalan asgari: ekstre toplamının asgari payından bu dönem ödenen kısım düşülür
// Ekstrede asgari yazıyorsa o, yoksa kurala göre hesaplanır
export const minimumPaymentOf = (card: CreditCardAccount) => {
  const total = card.statementTotal ?? statementDebtOf(card);
  const paid = Math.max(0, total - statementDebtOf(card));
  const minimum = card.statementMinimum ?? total * minimumRateOf(card);
  return Math.max(0, Math.round((minimum - paid) * 100) / 100);
};

// Kullanılabilir limit: limit − güncel borç − henüz ekstreye girmemiş taksitler (banka gibi; eksi olabilir)
export const availableLimitOf = (card: CreditCardAccount) =>
  Math.round((card.limit - card.currentDebt - (card.futureInstallments ?? 0)) * 100) / 100;

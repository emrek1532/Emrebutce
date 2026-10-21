import { Currency } from '../types/budget';

export const CURRENCY_CONFIG: Record<
  Currency,
  { symbol: string; label: string; rateToTRY: number; code: Currency }
> = {
  TRY: {
    symbol: '₺',
    label: 'Türk Lirası (₺)',
    rateToTRY: 1.0,
    code: 'TRY'
  },
  USD: {
    symbol: '$',
    label: 'Amerikan Doları ($)',
    rateToTRY: 34.50,
    code: 'USD'
  },
  EUR: {
    symbol: '€',
    label: 'Euro (€)',
    rateToTRY: 37.20,
    code: 'EUR'
  },
  GBP: {
    symbol: '£',
    label: 'İngiliz Sterlini (£)',
    rateToTRY: 44.10,
    code: 'GBP'
  }
};

export function formatCurrency(amount: number, currency: Currency = 'TRY'): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.TRY;
  const formattedNumber = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);

  return `${formattedNumber} ${config.symbol}`;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;
  const fromRate = CURRENCY_CONFIG[from]?.rateToTRY ?? 1;
  const toRate = CURRENCY_CONFIG[to]?.rateToTRY ?? 1;
  const amountInTRY = amount * fromRate;
  return amountInTRY / toRate;
}

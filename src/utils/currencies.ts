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
  // Küsuratlı tutar her zaman iki haneli yazılır (43.545,6 değil 43.545,60)
  const hasCents = Math.abs(Math.round(amount * 100) - Math.round(amount) * 100) > 0;
  const formattedNumber = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: hasCents ? 2 : 0,
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

// --- Güncel kurlar ---
// Kurlar Avrupa Merkez Bankası verisini sunan Frankfurter'dan günde bir kez alınır ve cihazda saklanır.
// İnternet yoksa son alınan kur, o da yoksa yukarıdaki sabit değerler kullanılır.
const RATES_KEY = 'cebim_rates_v1';
const RATE_SOURCES = [
  'https://api.frankfurter.dev/v1/latest?base=TRY&symbols=USD,EUR,GBP',
  'https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP'
];

export interface RatesInfo {
  date: string;
  fetchedAt: string;
  live: boolean;
}

let ratesInfo: RatesInfo = { date: '', fetchedAt: '', live: false };

function applyRates(rates: Partial<Record<Currency, number>>) {
  (['USD', 'EUR', 'GBP'] as Currency[]).forEach((c) => {
    const perTRY = rates[c];
    if (perTRY && perTRY > 0) CURRENCY_CONFIG[c].rateToTRY = Math.round((1 / perTRY) * 10000) / 10000;
  });
}

// Kayıtlı kurları hemen uygula (uygulama açılırken)
try {
  const cached = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(RATES_KEY) || 'null') : null;
  if (cached?.rates) {
    applyRates(cached.rates);
    ratesInfo = { date: cached.date, fetchedAt: cached.fetchedAt, live: true };
  }
} catch {
  // bozuk önbellek: sabit kurlarla devam
}

export function getRatesInfo(): RatesInfo {
  return ratesInfo;
}

// Kurlar bugün alınmadıysa yeniler; kurlar değiştiyse true döner
export async function refreshRates(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  if (ratesInfo.fetchedAt.startsWith(today)) return false;
  for (const url of RATE_SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.rates) continue;
      applyRates(data.rates);
      ratesInfo = { date: data.date, fetchedAt: new Date().toISOString(), live: true };
      try {
        localStorage.setItem(RATES_KEY, JSON.stringify({ rates: data.rates, date: data.date, fetchedAt: ratesInfo.fetchedAt }));
      } catch {
        // depolama yoksa yalnızca bu oturumda kullan
      }
      return true;
    } catch {
      // sıradaki kaynağı dene
    }
  }
  return false;
}

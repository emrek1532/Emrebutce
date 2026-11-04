// Kategori hafızası: aynı yerden yapılan işlemler aynı kategoriye önerilir ("Migros" → Market & Gıda).
// Ayrı veri tutulmaz; geçmiş işlemlerden hesaplanır.
import type { Transaction, TransactionType } from '../types/budget';

const fold = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

const STOP = new Set(['kart', 'karti', 'harcama', 'odeme', 'pos', 'www', 'com', 'tr', 'ltd', 'sti', 'as', 'san', 'tic', 'magaza', 'market', 'the', 've', 'ile']);

// Açıklamanın ilk anlamlı kelimesi (ör. "MIGROS KADIKOY 123" → "migros")
export function merchantKey(description: string): string {
  const words = fold(description)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w));
  return words[0] ?? '';
}

export function learnedCategory(description: string, transactions: Transaction[], type: TransactionType, allowed: string[]): string | undefined {
  const key = merchantKey(description);
  if (!key) return undefined;
  let best: Transaction | undefined;
  for (const t of transactions) {
    if (t.type !== type || !allowed.includes(t.category)) continue;
    if (merchantKey(t.description) !== key) continue;
    if (!best || t.date > best.date) best = t;
  }
  return best?.category;
}

import type { TransactionType } from '../types/budget';

// İşlem türüne göre renk ve işaret (gelir mavi +, gider kırmızı -, birikim turuncu)
export function txTone(type: TransactionType) {
  if (type === 'income') {
    return { sign: '+', text: 'text-sky-600 dark:text-sky-400', badge: 'bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400' };
  }
  if (type === 'saving') {
    return { sign: '', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400' };
  }
  return { sign: '-', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400' };
}

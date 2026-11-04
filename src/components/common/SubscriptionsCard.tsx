import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { Tv } from 'lucide-react';

// Düzenli giderlerdeki dijital abonelikler ve yıllık maliyeti
const SUBSCRIPTION = /netflix|spotify|youtube|disney|amazon|prime|apple|icloud|google one|google|exxen|blutv|blu tv|gain|tabii|digiturk|beinsport|bein|tod|mubi|hbo|max|storytel|audible|chatgpt|openai|claude|microsoft|office|xbox|playstation|ps plus|steam|duolingo|abonelik|üyelik|uyelik|turkcell tv|tv\+/i;

export const SubscriptionsCard: React.FC = () => {
  const { recurring, currency } = useBudget();
  const subs = recurring.filter((r) => r.active && r.type === 'expense' && SUBSCRIPTION.test(r.title));
  if (subs.length === 0) return null;
  const monthly = subs.reduce((s, r) => s + r.amount, 0);
  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);
  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <Tv className="w-4 h-4 text-violet-500" /> Abonelikler
        </h3>
        <span className="text-xs text-neutral-500">
          Aylık <b className="font-mono text-neutral-800 dark:text-neutral-200">{money(monthly)}</b> · Yıllık{' '}
          <b className="font-mono text-rose-600">{money(monthly * 12)}</b>
        </span>
      </div>
      <ul className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
        {subs.map((r) => (
          <li key={r.id} className="py-1.5 flex justify-between gap-2">
            <span className="text-neutral-700 dark:text-neutral-300 truncate">{r.title}</span>
            <span className="font-mono shrink-0">
              {money(r.amount)} <span className="text-neutral-400">/ yıl {money(r.amount * 12)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-neutral-500">Kullanmadığınız abonelik varsa iptal etmek yıllık bu kadar kazandırır.</p>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import type { CreditCardAccount } from '../../types/budget';
import { availableLimitOf, minimumPaymentOf, periodSpendOf, statementDebtOf } from '../../utils/cardStatement';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { FileText, Pencil, X } from 'lucide-react';

// Karta dokununca açılan detay: özet, hızlı borç ödeme, ekstre yükleme, düzenleme ve bu kartla yapılan son harcamalar
export const CardDetailSheet: React.FC<{
  card: CreditCardAccount;
  gradient: string;
  onClose: () => void;
  onEdit: () => void;
  onStatement: () => void;
}> = ({ card, gradient, onClose, onEdit, onStatement }) => {
  const { transactions, payCardDebt } = useBudget();
  const [custom, setCustom] = useState('');
  const money = (v: number) => formatCurrency(v, 'TRY');
  const stmt = statementDebtOf(card);
  const minimum = minimumPaymentOf(card);
  const period = periodSpendOf(card);
  const available = availableLimitOf(card);
  const recent = useMemo(
    () => transactions.filter((t) => t.cardId === card.id || (t.type === 'expense' && t.description.includes(`(${card.name})`))).slice(0, 20),
    [transactions, card.id, card.name]
  );

  const pay = (amount: number) => {
    if (!(amount > 0)) return;
    if (!confirm(`${card.bank} ${card.name} kartına ${money(amount)} ödeme yapıldı olarak kaydedilsin mi?\nKart borcu düşer, ödeme gider olarak eklenir.`)) return;
    payCardDebt(card.id, amount, true);
    setCustom('');
  };
  const customAmount = (() => {
    const s = custom.trim().replace(/\s/g, '');
    return s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : /^\d{1,3}(\.\d{3})+$/.test(s) ? Number(s.replace(/\./g, '')) : Number(s);
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center pb-[env(safe-area-inset-bottom)] sm:pb-0" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative overflow-hidden p-5 text-white bg-gradient-to-br ${gradient}`}>
          <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{card.bank}</span>
              <h3 className="text-lg font-bold">
                {card.name} <span className="text-xs font-medium text-white/70">· {card.member}</span>
              </h3>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-white/20" title="Kapat">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <div>
              <span className="text-[11px] text-white/75 block">Güncel borç</span>
              <span className="text-3xl font-extrabold font-mono">{money(card.currentDebt)}</span>
            </div>
            {card.limit > 0 && (
              <div className="text-right">
                <span className="text-[11px] text-white/75 block">Kalan limit</span>
                <span className={`text-lg font-bold font-mono ${available < 0 ? 'text-rose-100' : ''}`}>{money(available)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-2.5">
              <span className="text-rose-700 dark:text-rose-300 block">Ekstreden kalan</span>
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">{money(stmt)}</span>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5">
              <span className="text-amber-700 dark:text-amber-300 block">Kalan asgari</span>
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">{money(minimum)}</span>
            </div>
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-2.5">
              <span className="text-neutral-500 block">Dönem içi</span>
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100">{money(period)}</span>
            </div>
          </div>

          {card.currentDebt > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Borç öde</p>
              <div className="grid grid-cols-2 gap-2">
                {minimum > 0 && (
                  <button type="button" onClick={() => pay(minimum)} className="py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    Asgari · {money(minimum)}
                  </button>
                )}
                {stmt > 0 && (
                  <button type="button" onClick={() => pay(stmt)} className="py-2.5 rounded-xl bg-sky-600 text-white text-xs font-semibold">
                    Ekstrenin tamamı · {money(stmt)}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  inputMode="decimal"
                  placeholder="Başka tutar (₺)"
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
                <button
                  type="button"
                  disabled={!(customAmount > 0)}
                  onClick={() => pay(customAmount)}
                  className="px-4 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold disabled:opacity-40"
                >
                  Öde
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onStatement} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold">
              <FileText className="w-4 h-4" /> Ekstre yükle
            </button>
            <button type="button" onClick={onEdit} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold">
              <Pencil className="w-4 h-4" /> Düzenle / limiti eşitle
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Bu kartla son harcamalar</p>
            {recent.length === 0 ? (
              <p className="text-xs text-neutral-500">Bu karta bağlı harcama yok. Harcama eklerken ödeme "Kredi Kartı" ve bu kartı seç.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {recent.map((t) => (
                  <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-800 dark:text-neutral-200">{t.description}</span>
                      <span className="text-[10px] text-neutral-400">
                        {t.date.split('-').reverse().slice(0, 2).join('.')} · {t.category}
                        {t.installmentInfo && !t.installmentInfo.installmentId ? ` · ${t.installmentInfo.total} taksit` : ''}
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-rose-600 shrink-0">−{money(convertCurrency(t.amount, t.currency, 'TRY'))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

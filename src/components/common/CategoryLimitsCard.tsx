import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { EXPENSE_CATEGORIES } from '../../data/initialData';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { Gauge, Trash2 } from 'lucide-react';

const COLORS = ['#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#3B82F6', '#EC4899'];

// Kategori bütçe sınırları: "market ayda en fazla 8.000 ₺" gibi. %80'de uyarı, aşınca kritik bildirim.
export const CategoryLimitsCard: React.FC = () => {
  const { categoryLimits, categorySpendingMap, currency, addCategoryLimit, updateCategoryLimit, deleteCategoryLimit } = useBudget();
  const free = EXPENSE_CATEGORIES.filter((c) => !categoryLimits.some((l) => l.category === c));
  const [cat, setCat] = useState('');
  const [amount, setAmount] = useState('');
  const money = (v: number) => formatCurrency(v, currency);
  const num = (t: string) => Number(t.replace(/\./g, '').replace(',', '.'));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const category = cat || free[0];
    const value = num(amount);
    if (!category || !(value > 0)) return;
    addCategoryLimit({
      category,
      monthlyLimit: value,
      currency: 'TRY',
      color: COLORS[categoryLimits.length % COLORS.length],
      iconName: 'Gauge',
      alertThresholdPercent: 80
    });
    setAmount('');
    setCat('');
  };

  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
        <Gauge className="w-4 h-4 text-sky-600" /> Kategori sınırları
      </h3>
      {categoryLimits.length === 0 && (
        <p className="text-xs text-neutral-500">Örneğin "Market & Gıda ayda en fazla 8.000 ₺" deyin; %80'e gelince ve aşınca bildirim gelir.</p>
      )}
      <ul className="space-y-2.5">
        {categoryLimits.map((l) => {
          const limit = convertCurrency(l.monthlyLimit, l.currency, currency);
          const spent = categorySpendingMap[l.category] || 0;
          const ratio = limit > 0 ? spent / limit : 0;
          const bar = ratio >= 1 ? 'bg-rose-500' : ratio * 100 >= l.alertThresholdPercent ? 'bg-amber-500' : 'bg-sky-500';
          return (
            <li key={l.id} className="text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{l.category}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className={`font-mono ${ratio >= 1 ? 'text-rose-600 font-bold' : 'text-neutral-600 dark:text-neutral-300'}`}>{money(spent)}</span>
                  <button
                    type="button"
                    className="font-mono text-neutral-400 hover:text-sky-600 underline decoration-dotted"
                    title="Sınırı değiştir"
                    onClick={() => {
                      const v = prompt(`${l.category} için aylık sınır (₺)`, String(l.monthlyLimit));
                      if (v !== null && num(v) > 0) updateCategoryLimit({ ...l, monthlyLimit: num(v) });
                    }}
                  >
                    / {money(limit)}
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm(`${l.category} sınırı kaldırılsın mı?`) && deleteCategoryLimit(l.id)}
                    className="p-1 text-neutral-300 hover:text-rose-600"
                    title="Kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {free.length > 0 && (
        <form onSubmit={add} className="flex gap-2 pt-1">
          <select
            value={cat || free[0]}
            onChange={(e) => setCat(e.target.value)}
            className="flex-1 min-w-0 text-xs py-2 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          >
            {free.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Aylık ₺"
            className="w-24 text-xs py-2 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          />
          <button type="submit" className="px-3 text-xs font-semibold rounded-lg bg-sky-600 text-white">
            Ekle
          </button>
        </form>
      )}
    </div>
  );
};

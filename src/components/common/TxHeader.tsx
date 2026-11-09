import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { isCashExpense, monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { monthLabel } from './MonthSwitcher';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// İşlemler sekmesinin üst şeridi: ay seçici + filtredeki işlemlerin gelir/gider toplamı
export const TxHeader: React.FC<{ cards?: boolean }> = ({ cards }) => {
  const { selectedMonth, setSelectedMonth, filteredTransactions, currency } = useBudget();
  const current = monthKeyOf(new Date());
  const isCurrent = selectedMonth === current;
  const sum = (type: string) =>
    filteredTransactions.filter((t) => t.type === type).reduce((s, t) => s + convertCurrency(t.amount, t.currency, currency), 0);
  const income = sum('income');
  // Özet'teki gibi: hesaptan çıkan gider ve kartla yapılan harcama ayrı (ikisinin toplamı = tüm giderler)
  const val = (t: (typeof filteredTransactions)[number]) => convertCurrency(t.amount, t.currency, currency);
  const expense = filteredTransactions.filter((t) => isCashExpense(t)).reduce((s, t) => s + val(t), 0);
  const card = filteredTransactions.filter((t) => t.type === 'expense' && !isCashExpense(t)).reduce((s, t) => s + val(t), 0);
  const money = (v: number) => formatCurrency(v, currency);
  if (cards) {
    // Bilgisayar: ay üst çubuktan seçilir; burada yalnızca filtredeki toplamlar
    return (
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ['Gelir', money(income), 'from-emerald-400 to-teal-600'],
            ['Gider (hesaptan)', money(expense), 'from-rose-400 to-pink-600'],
            ['Kartla harcanan', money(card), 'from-sky-500 to-indigo-700']
          ] as const
        ).map(([label, value, g]) => (
          <div key={label} className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-sm bg-gradient-to-br ${g}`}>
            <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            <span className="relative text-xs font-medium text-white/85 block">{label}</span>
            <span className="relative text-2xl font-extrabold font-mono block truncate">{value}</span>
          </div>
        ))}
      </div>
    );
  }
  const nav = 'p-1.5 rounded-lg text-white/80 hover:bg-white/15 disabled:opacity-30';
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 flex flex-wrap items-center justify-between gap-3">
      <div className="absolute -right-16 -top-24 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative flex items-center gap-1">
        <button type="button" className={nav} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))} title="Önceki ay">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="min-w-[8rem] text-center leading-tight">
          <span className="text-base font-bold block">{monthLabel(selectedMonth)}</span>
          <span className="text-[10px] text-white/75">{filteredTransactions.length} kayıt</span>
        </span>
        <button type="button" className={nav} disabled={isCurrent} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))} title="Sonraki ay">
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isCurrent && (
          <button type="button" onClick={() => setSelectedMonth(current)} className="ml-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25">
            Bu aya dön
          </button>
        )}
      </div>
      <div className="relative grid grid-cols-3 gap-1.5 sm:gap-2 w-full sm:w-auto">
        {(
          [
            ['Gelir', money(income), 'bg-emerald-300'],
            ['Gider', money(expense), 'bg-rose-300'],
            ['Kartla', money(card), 'bg-sky-200']
          ] as const
        ).map(([label, value, dot]) => (
          <div
            key={label}
            className="rounded-xl bg-white/15 px-2 py-2 min-w-0 sm:min-w-[7.5rem]"
            title={label === 'Gider' ? 'Hesaptan çıkan (Özet ile aynı)' : label === 'Kartla' ? 'Kartla yapılan harcama; kart borcu ödenince gidere girer' : undefined}
          >
            <span className="text-[11px] text-white/80 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </span>
            <span className="text-[12px] sm:text-sm font-bold font-mono block whitespace-nowrap tracking-tight">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

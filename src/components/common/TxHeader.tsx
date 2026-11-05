import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
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
  const expense = sum('expense');
  const money = (v: number) => formatCurrency(v, currency);
  if (cards) {
    // Bilgisayar: ay üst çubuktan seçilir; burada yalnızca filtredeki toplamlar
    return (
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ['Gelir', money(income), 'from-emerald-400 to-teal-600'],
            ['Gider (kart dahil)', money(expense), 'from-rose-400 to-pink-600'],
            ['Kayıt', String(filteredTransactions.length), 'from-sky-500 to-indigo-700']
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
        <span className="text-base font-bold min-w-[8rem] text-center">{monthLabel(selectedMonth)}</span>
        <button type="button" className={nav} disabled={isCurrent} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))} title="Sonraki ay">
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isCurrent && (
          <button type="button" onClick={() => setSelectedMonth(current)} className="ml-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25">
            Bu aya dön
          </button>
        )}
      </div>
      <div className="relative grid grid-cols-[1fr_1fr_auto] gap-2 w-full sm:w-auto">
        {(
          [
            ['Gelir', money(income), 'bg-emerald-300'],
            ['Gider', money(expense), 'bg-rose-300'],
            ['Kayıt', String(filteredTransactions.length), 'bg-white']
          ] as const
        ).map(([label, value, dot]) => (
          <div key={label} className="rounded-xl bg-white/15 px-2.5 py-2 min-w-0 sm:min-w-[7.5rem]" title={label === 'Gider' ? 'Kartla yapılanlar dahil' : undefined}>
            <span className="text-[11px] text-white/80 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </span>
            <span className="text-[13px] sm:text-sm font-bold font-mono block whitespace-nowrap">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

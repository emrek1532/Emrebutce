import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { monthLabel } from './MonthSwitcher';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// İşlemler sekmesinin üst şeridi: ay seçici + filtredeki işlemlerin gelir/gider toplamı
export const TxHeader: React.FC = () => {
  const { selectedMonth, setSelectedMonth, filteredTransactions, currency } = useBudget();
  const current = monthKeyOf(new Date());
  const isCurrent = selectedMonth === current;
  const sum = (type: string) =>
    filteredTransactions.filter((t) => t.type === type).reduce((s, t) => s + convertCurrency(t.amount, t.currency, currency), 0);
  const income = sum('income');
  const expense = sum('expense');
  const money = (v: number) => formatCurrency(v, currency);
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
      <div className="relative grid grid-cols-3 gap-2 w-full sm:w-auto">
        {(
          [
            ['Gelir', money(income), 'bg-emerald-300'],
            ['Gider', money(expense), 'bg-rose-300'],
            ['Kayıt', String(filteredTransactions.length), 'bg-white']
          ] as const
        ).map(([label, value, dot]) => (
          <div key={label} className="rounded-xl bg-white/15 px-3 py-2 min-w-0 sm:min-w-[7.5rem]">
            <span className="text-[11px] text-white/80 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </span>
            <span className="text-sm font-bold font-mono block truncate">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

// Özetin hangi ayı gösterdiğini seçer (geçmiş aylara bakmak için)
export const MonthSwitcher: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useBudget();
  const current = monthKeyOf(new Date());
  const isCurrent = selectedMonth === current;
  const btn = 'p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-30';
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
      <button type="button" className={btn} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))} title="Önceki ay">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="text-center">
        <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{monthLabel(selectedMonth)}</div>
        {!isCurrent && (
          <button type="button" onClick={() => setSelectedMonth(current)} className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
            Bu aya dön
          </button>
        )}
      </div>
      <button type="button" className={btn} disabled={isCurrent} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))} title="Sonraki ay">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

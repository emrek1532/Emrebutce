import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { monthLabel } from '../common/MonthSwitcher';
import { CalendarDays, ChevronDown } from 'lucide-react';

// Üst çubuktaki ay seçici (son 24 ay)
export const MonthSelect: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { selectedMonth, setSelectedMonth } = useBudget();
  const current = monthKeyOf(new Date());
  const months = Array.from({ length: 24 }, (_, i) => shiftMonthKey(current, -i));
  if (!months.includes(selectedMonth)) months.push(selectedMonth);
  return (
    <label
      className={`relative flex items-center gap-2 pl-3 pr-8 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-800 dark:text-neutral-200 shadow-xs cursor-pointer ${className}`}
    >
      <CalendarDays className="w-4 h-4 text-sky-600 shrink-0" />
      <span className="whitespace-nowrap">{selectedMonth === current ? 'Bu Ay' : monthLabel(selectedMonth)}</span>
      <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5" />
      <select
        aria-label="Ay seç"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {m === current ? `Bu ay (${monthLabel(m)})` : monthLabel(m)}
          </option>
        ))}
      </select>
    </label>
  );
};

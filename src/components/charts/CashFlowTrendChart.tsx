import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { convertCurrency, formatCurrency } from '../../utils/currencies';

interface MonthData {
  key: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
}

export const CashFlowTrendChart: React.FC = () => {
  const { transactions, currency } = useBudget();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Generate last 6 months list
  const monthsData: MonthData[] = React.useMemo(() => {
    const list: MonthData[] = [];
    const now = new Date();

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const label = `${monthNames[d.getMonth()]} ${y.toString().slice(-2)}`;

      let income = 0;
      let expense = 0;

      transactions.forEach((tx) => {
        if (tx.date.startsWith(key)) {
          const val = convertCurrency(tx.amount, tx.currency, currency);
          if (tx.type === 'income') income += val;
          else expense += val;
        }
      });

      list.push({
        key,
        label,
        income,
        expense,
        savings: income - expense
      });
    }

    return list;
  }, [transactions, currency]);

  // Max value for scaling
  const maxVal = Math.max(
    ...monthsData.map((m) => Math.max(m.income, m.expense)),
    50000
  );

  return (
    <div className="w-full">
      {/* Chart container */}
      <div className="relative h-64 w-full pt-4 pb-2">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-neutral-400 dark:text-neutral-600 text-[10px] font-mono">
          <div className="border-b border-neutral-100 dark:border-neutral-800/80 w-full flex justify-between">
            <span>{formatCurrency(maxVal, currency)}</span>
          </div>
          <div className="border-b border-neutral-100 dark:border-neutral-800/80 w-full flex justify-between">
            <span>{formatCurrency(maxVal * 0.66, currency)}</span>
          </div>
          <div className="border-b border-neutral-100 dark:border-neutral-800/80 w-full flex justify-between">
            <span>{formatCurrency(maxVal * 0.33, currency)}</span>
          </div>
          <div className="border-b border-neutral-200 dark:border-neutral-700 w-full flex justify-between">
            <span>0</span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="relative h-full flex items-end justify-between gap-2 sm:gap-4 px-2 pb-8">
          {monthsData.map((m, idx) => {
            const incomeH = maxVal > 0 ? (m.income / maxVal) * 100 : 0;
            const expenseH = maxVal > 0 ? (m.expense / maxVal) * 100 : 0;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={m.key}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 z-20 bg-neutral-900 dark:bg-neutral-800 text-white rounded-lg p-2.5 shadow-xl text-xs whitespace-nowrap border border-neutral-700">
                    <p className="font-semibold text-neutral-200 mb-1">{m.label}</p>
                    <div className="flex items-center justify-between gap-4 text-emerald-400 font-mono">
                      <span>Gelir:</span>
                      <span>+{formatCurrency(m.income, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-rose-400 font-mono">
                      <span>Gider:</span>
                      <span>-{formatCurrency(m.expense, currency)}</span>
                    </div>
                    <div className="border-t border-neutral-700 mt-1 pt-1 flex items-center justify-between gap-4 font-bold font-mono">
                      <span>Net Tasarruf:</span>
                      <span className={m.savings >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.savings >= 0 ? '+' : ''}{formatCurrency(m.savings, currency)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bars */}
                <div className="flex items-end justify-center gap-1 sm:gap-2 w-full max-w-[48px] h-full pb-0.5">
                  {/* Income bar */}
                  <div
                    className="w-1/2 bg-emerald-500 rounded-t transition-all duration-300 group-hover:bg-emerald-400 shadow-sm"
                    style={{ height: `${Math.max(incomeH, 2)}%` }}
                  />
                  {/* Expense bar */}
                  <div
                    className="w-1/2 bg-rose-500 rounded-t transition-all duration-300 group-hover:bg-rose-400 shadow-sm"
                    style={{ height: `${Math.max(expenseH, 2)}%` }}
                  />
                </div>

                {/* Label */}
                <span className="absolute bottom-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate max-w-full">
                  {m.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>Gelir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500" />
          <span>Gider</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { budgetMonthOf, isCashExpense } from '../../utils/budgetMonth';

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
        if (budgetMonthOf(tx) === key) {
          const val = convertCurrency(tx.amount, tx.currency, currency);
          if (tx.type === 'income') income += val;
          // Kartlı harcama nakit çıkışı değil; kart borcu ödemesi gider olarak sayılır
          else if (isCashExpense(tx)) expense += val;
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

  // Eksen: en büyük değeri 3 eşit, yuvarlak adıma böl (ör. 25.000 / 50.000 / 75.000)
  const peak = Math.max(...monthsData.map((m) => Math.max(m.income, m.expense)), 1);
  const rawStep = peak / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * pow >= rawStep) ?? 10) * pow;
  const maxVal = step * 3;
  const short = (v: number) =>
    v >= 1000 ? `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(v / 1000)} B` : String(Math.round(v));

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <div className="w-10 shrink-0 h-48 flex flex-col justify-between text-[10px] text-neutral-400 font-mono text-right -mt-1.5 pb-0">
          {[3, 2, 1, 0].map((k) => (
            <span key={k} className="leading-3">{short(step * k)}</span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative h-48">
            {[0, 1, 2, 3].map((k) => (
              <div
                key={k}
                className={`absolute left-0 right-0 border-t ${k === 0 ? 'border-neutral-200 dark:border-neutral-700' : 'border-neutral-100 dark:border-neutral-800/80'}`}
                style={{ bottom: `${(k / 3) * 100}%` }}
              />
            ))}
            <div className="relative h-full flex items-end justify-between gap-2 sm:gap-4 px-1">
              {monthsData.map((m, idx) => {
                const incomeH = (m.income / maxVal) * 100;
                const expenseH = (m.expense / maxVal) * 100;
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={m.key}
                    className="flex-1 h-full flex items-end justify-center gap-1 sm:gap-1.5 cursor-pointer relative group"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setHoveredIdx(isHovered ? null : idx)}
                  >
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-20 bg-neutral-900 dark:bg-neutral-800 text-white rounded-lg p-2.5 shadow-xl text-xs whitespace-nowrap border border-neutral-700">
                        <p className="font-semibold text-neutral-200 mb-1">{m.label}</p>
                        <div className="flex items-center justify-between gap-4 text-sky-400 font-mono">
                          <span>Gelir:</span>
                          <span>+{formatCurrency(m.income, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-400 font-mono">
                          <span>Gider:</span>
                          <span>-{formatCurrency(m.expense, currency)}</span>
                        </div>
                        <div className="border-t border-neutral-700 mt-1 pt-1 flex items-center justify-between gap-4 font-bold font-mono">
                          <span>Fark:</span>
                          <span className={m.savings >= 0 ? 'text-sky-400' : 'text-rose-400'}>
                            {m.savings >= 0 ? '+' : ''}
                            {formatCurrency(m.savings, currency)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="w-1/2 max-w-[18px] bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md transition-all group-hover:opacity-80" style={{ height: `${incomeH}%`, minHeight: m.income > 0 ? 3 : 0 }} />
                    <div className="w-1/2 max-w-[18px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-md transition-all group-hover:opacity-80" style={{ height: `${expenseH}%`, minHeight: m.expense > 0 ? 3 : 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4 px-1 mt-1.5">
            {monthsData.map((m) => (
              <span key={m.key} className="flex-1 text-center text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                {m.label.split(' ')[0].slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-sky-500" />
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

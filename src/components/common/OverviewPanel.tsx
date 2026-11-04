import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { txTone } from '../../utils/txStyle';
import { monthLabel } from './MonthSwitcher';
import { BudgetPlanCard } from './BudgetPlanCard';
import { UpcomingPayments } from './UpcomingPayments';
import { AskBox } from './AskBox';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

const card = 'p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs';

// Özet sekmesi: tüm cihazlarda aynı, sade içerik
export const OverviewPanel: React.FC<{ onEditTx: (tx: Transaction) => void; onSeeAll: () => void }> = ({ onEditTx, onSeeAll }) => {
  const {
    selectedMonth,
    setSelectedMonth,
    currency,
    monthlyIncome,
    monthlyExpense,
    monthlyCardSpend,
    monthlySavings,
    monthlyBalance,
    filteredTransactions
  } = useBudget();
  const current = monthKeyOf(new Date());
  const isCurrent = selectedMonth === current;
  const money = (v: number) => formatCurrency(v, currency);
  const navBtn = 'p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30';

  const summary = (
    <div className={card}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          <button type="button" className={navBtn} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))} title="Önceki ay">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 min-w-[7.5rem] text-center">{monthLabel(selectedMonth)}</span>
          <button type="button" className={navBtn} disabled={isCurrent} onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))} title="Sonraki ay">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isCurrent && (
          <button type="button" onClick={() => setSelectedMonth(current)} className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
            Bu aya dön
          </button>
        )}
      </div>
      <span className="text-[11px] text-neutral-500 block">Net bakiye</span>
      <span
        className={`text-3xl font-bold font-mono tabular-nums ${monthlyBalance >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}
      >
        {monthlyBalance >= 0 ? '+' : ''}
        {money(monthlyBalance)}
      </span>
      <div className={`grid ${monthlySavings > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800`}>
        <div className="min-w-0">
          <span className="text-[11px] text-neutral-500 block">Gelir</span>
          <span className="text-sm font-bold font-mono text-sky-600 dark:text-sky-400">{money(monthlyIncome)}</span>
        </div>
        <div className="min-w-0">
          <span className="text-[11px] text-neutral-500 block">Gider</span>
          <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">{money(monthlyExpense)}</span>
          {monthlyCardSpend > 0 && <span className="text-[10px] text-neutral-400 block">+ kartla {money(monthlyCardSpend)}</span>}
        </div>
        {monthlySavings > 0 && (
          <div className="min-w-0">
            <span className="text-[11px] text-neutral-500 block">Birikim</span>
            <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{money(monthlySavings)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const recent = (
    <div className={card}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Son işlemler</h3>
        <button type="button" onClick={onSeeAll} className="text-xs text-sky-600 dark:text-sky-400 font-medium">
          Tümü ({filteredTransactions.length})
        </button>
      </div>
      {filteredTransactions.length === 0 ? (
        <p className="text-xs text-neutral-500 py-2">Bu ay işlem yok.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredTransactions.slice(0, 5).map((tx) => {
            const tone = txTone(tx.type);
            return (
              <li
                key={tx.id}
                onClick={() => onEditTx(tx)}
                className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 rounded-lg"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tone.badge}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{tx.description}</p>
                    <span className="text-[10px] text-neutral-400">
                      {tx.date.split('-').reverse().slice(0, 2).join('.')} · {tx.category}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-bold font-mono shrink-0 ${tone.text}`}>
                  {tone.sign}
                  {money(convertCurrency(tx.amount, tx.currency, currency))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
        {summary}
        <BudgetPlanCard />
      </div>
      <div className="space-y-4">
        {isCurrent && <UpcomingPayments />}
        {isCurrent && <AskBox />}
        {recent}
      </div>
    </div>
  );
};

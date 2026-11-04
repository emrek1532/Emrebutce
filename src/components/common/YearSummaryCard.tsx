import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { budgetMonthOf, isCashExpense } from '../../utils/budgetMonth';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Yılın 12 ayı: gelir, (nakit) gider, birikim ve aydan artan
export const YearSummaryCard: React.FC = () => {
  const { transactions, selectedMonth, currency } = useBudget();
  const [year, setYear] = useState(Number(selectedMonth.slice(0, 4)));
  const data = useMemo(() => {
    const rows = MONTHS.map((label, i) => ({ label, key: `${year}-${String(i + 1).padStart(2, '0')}`, income: 0, expense: 0, saving: 0, count: 0 }));
    for (const t of transactions) {
      const m = budgetMonthOf(t);
      if (!m.startsWith(`${year}-`)) continue;
      const r = rows[Number(m.slice(5, 7)) - 1];
      const v = convertCurrency(t.amount, t.currency, currency);
      r.count++;
      if (t.type === 'income') r.income += v;
      else if (t.type === 'saving') r.saving += v;
      else if (isCashExpense(t)) r.expense += v;
    }
    const list = rows.filter((r) => r.count > 0);
    const sum = (k: 'income' | 'expense' | 'saving') => list.reduce((s, r) => s + r[k], 0);
    const max = Math.max(1, ...list.map((r) => Math.max(r.income, r.expense)));
    return { list, income: sum('income'), expense: sum('expense'), saving: sum('saving'), max };
  }, [transactions, year, currency]);
  const money = (v: number) => formatCurrency(v, currency);
  const net = data.income - data.expense - data.saving;

  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <CalendarRange className="w-4 h-4 text-sky-600" /> Yıllık özet
        </h3>
        <div className="flex items-center gap-1 text-sm font-bold">
          <button type="button" onClick={() => setYear(year - 1)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {year}
          <button type="button" onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {(
          [
            ['Gelir', data.income, 'text-sky-600'],
            ['Gider', data.expense, 'text-rose-600'],
            ['Birikim', data.saving, 'text-amber-600'],
            ['Artan', net, net >= 0 ? 'text-emerald-600' : 'text-rose-600']
          ] as const
        ).map(([l, v, c]) => (
          <div key={l} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-2.5">
            <span className="text-[11px] text-neutral-500 block">{l}</span>
            <span className={`font-mono font-bold text-sm ${c}`}>{money(v)}</span>
          </div>
        ))}
      </div>
      {data.list.length === 0 ? (
        <p className="text-xs text-neutral-500">{year} için kayıt yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] text-neutral-500 uppercase">
              <tr>
                <th className="text-left py-1.5">Ay</th>
                <th className="text-left py-1.5 w-1/3">Gelir / gider</th>
                <th className="text-right py-1.5">Gelir</th>
                <th className="text-right py-1.5">Gider</th>
                <th className="text-right py-1.5 hidden sm:table-cell">Birikim</th>
                <th className="text-right py-1.5">Artan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.list.map((r) => {
                const left = r.income - r.expense - r.saving;
                return (
                  <tr key={r.key}>
                    <td className="py-1.5 font-semibold">{r.label}</td>
                    <td className="py-1.5 pr-2">
                      <div className="space-y-0.5">
                        <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${(r.income / data.max) * 100}%` }} />
                        <div className="h-1.5 rounded-full bg-rose-400" style={{ width: `${(r.expense / data.max) * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-mono text-sky-600">{money(r.income)}</td>
                    <td className="py-1.5 text-right font-mono text-rose-600">{money(r.expense)}</td>
                    <td className="py-1.5 text-right font-mono text-amber-600 hidden sm:table-cell">{money(r.saving)}</td>
                    <td className={`py-1.5 text-right font-mono font-semibold ${left >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(left)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-neutral-400">Gider nakit akışıdır: kartla yapılan harcamalar kart borcu ödendiği ay sayılır.</p>
    </div>
  );
};

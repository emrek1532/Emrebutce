import React, { useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { budgetMonthOf, monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { monthLabel } from './MonthSwitcher';
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';

// Seçili ayın harcamalarını bir önceki ayla kategori kategori karşılaştırır.
// İçinde bulunulan ay için önceki ayın da aynı gününe kadarki kısmı alınır (adil karşılaştırma).
export const MonthReportCard: React.FC = () => {
  const { transactions, selectedMonth, currency } = useBudget();

  const report = useMemo(() => {
    const prev = shiftMonthKey(selectedMonth, -1);
    const isCurrent = selectedMonth === monthKeyOf(new Date());
    const today = new Date().getDate();
    const sum = (month: string, cutDay?: number) => {
      const map = new Map<string, number>();
      for (const t of transactions) {
        if (t.type !== 'expense' || budgetMonthOf(t) !== month) continue;
        if (cutDay && t.date.slice(0, 7) === month && Number(t.date.slice(8, 10)) > cutDay) continue;
        map.set(t.category, (map.get(t.category) ?? 0) + convertCurrency(t.amount, t.currency, currency));
      }
      return map;
    };
    const now = sum(selectedMonth);
    const before = sum(prev, isCurrent ? today : undefined);
    const cats = new Set([...now.keys(), ...before.keys()]);
    const rows = [...cats]
      .map((c) => ({ category: c, now: now.get(c) ?? 0, before: before.get(c) ?? 0 }))
      .map((r) => ({ ...r, diff: r.now - r.before }))
      .filter((r) => Math.abs(r.diff) >= 1)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
    const total = [...now.values()].reduce((s, v) => s + v, 0);
    const totalBefore = [...before.values()].reduce((s, v) => s + v, 0);
    return { prev, isCurrent, rows, total, totalBefore, hasBefore: before.size > 0 };
  }, [transactions, selectedMonth, currency]);

  const money = (v: number) => formatCurrency(Math.abs(v), currency);
  const diff = report.total - report.totalBefore;
  // Geçen ay kaydı yoksa karşılaştırılacak bir şey yok: kart gösterilmez
  if (!report.hasBefore) return null;

  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
        <Scale className="w-4 h-4 text-sky-600" /> Geçen aya göre
      </h3>
      {(
        <>
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            Toplam harcama {monthLabel(report.prev)}
            {report.isCurrent ? ' ayının aynı gününe' : ''} göre{' '}
            <b className={diff > 0 ? 'text-rose-600' : 'text-sky-600'}>
              {money(diff)} {diff > 0 ? 'fazla' : 'az'}
            </b>{' '}
            ({money(report.total)} / {money(report.totalBefore)}).
          </p>
          <ul className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
            {report.rows.map((r) => (
              <li key={r.category} className="py-1.5 flex items-center justify-between gap-2">
                <span className="text-neutral-700 dark:text-neutral-300 truncate">{r.category}</span>
                <span className={`flex items-center gap-0.5 font-mono shrink-0 ${r.diff > 0 ? 'text-rose-600' : 'text-sky-600'}`}>
                  {r.diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {money(r.diff)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

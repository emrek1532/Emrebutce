import React, { useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { budgetMonthOf, isSpending } from '../../utils/budgetMonth';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { Users } from 'lucide-react';

// Seçili ayın harcamaları kişi kişi (kartla yapılanlar dahil); "Ortak" ayrı satır
export const MemberSplitCard: React.FC = () => {
  const { transactions, selectedMonth, currency, familyMembers } = useBudget();
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (!isSpending(t) || budgetMonthOf(t) !== selectedMonth) continue;
      map.set(t.member || 'Ortak', (map.get(t.member || 'Ortak') ?? 0) + convertCurrency(t.amount, t.currency, currency));
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0);
    return { total, list: [...map.entries()].sort((a, b) => b[1] - a[1]) };
  }, [transactions, selectedMonth, currency]);
  const color = (name: string) => familyMembers.find((m) => m.name === name)?.color ?? '#94a3b8';

  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
        <Users className="w-4 h-4 text-sky-600" /> Kim ne harcadı
      </h3>
      {rows.list.length === 0 ? (
        <p className="text-xs text-neutral-500">Bu ay harcama yok.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.list.map(([name, value]) => (
            <li key={name} className="text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color(name) }} />
                  {name}
                </span>
                <span className="font-mono">
                  {formatCurrency(value, currency)} <span className="text-neutral-400">· %{Math.round((value / rows.total) * 100)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(value / rows.total) * 100}%`, backgroundColor: color(name) }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

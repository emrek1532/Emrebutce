import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { simulate, toPlanDebt, type PlanDebt } from '../../utils/debtPlan';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { monthLabel } from '../common/MonthSwitcher';
import { Rocket } from 'lucide-react';

export const DebtPlanner: React.FC = () => {
  const { installments, currency, isInstallmentPaidThisMonth } = useBudget();
  const [extraText, setExtraText] = useState('');
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const extra = Number(extraText.replace(/\./g, '').replace(',', '.')) || 0;

  const debts = useMemo<PlanDebt[]>(
    () =>
      installments
        .filter((i) => (i.schedule ? i.schedule.some((s) => !s.paid) : !!i.totalInstallments && (i.remainingInstallments ?? 0) > 0))
        .map((i) => toPlanDebt(i, isInstallmentPaidThisMonth(i.id)))
        .filter((d) => d.balance > 0 && d.monthly > 0),
    [installments, isInstallmentPaidThisMonth]
  );

  const result = useMemo(() => {
    const included = debts.filter((d) => !excluded[d.id]);
    const fixed = debts.filter((d) => excluded[d.id]);
    const base = simulate(debts, 0);
    // Erken ödenemeyen borçlar (ör. Eminevim) kendi takviminde kalır
    const plan = simulate(included, extra);
    const fixedPlan = simulate(fixed, 0);
    const done = new Map([...plan.done, ...fixedPlan.done]);
    return { base, months: Math.max(plan.months, fixedPlan.months), done, interestSaved: base.totalPaid - plan.totalPaid - fixedPlan.totalPaid };
  }, [debts, extra, excluded]);

  if (debts.length === 0) return null;
  const now = monthKeyOf(new Date());
  const at = (m: number) => monthLabel(shiftMonthKey(now, m));
  const money = (v: number) => formatCurrency(convertCurrency(v, 'TRY', currency), currency);
  const saved = result.base.months - result.months;

  return (
    <section className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <Rocket className="w-4 h-4 text-indigo-500" /> Borç kapatma planı
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-neutral-600 dark:text-neutral-300">Her ay fazladan</span>
        <input
          value={extraText}
          onChange={(e) => setExtraText(e.target.value)}
          inputMode="decimal"
          placeholder="ör. 3.000"
          className="w-28 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
        />
        <span className="text-neutral-600 dark:text-neutral-300">₺ öderseniz:</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3">
          <span className="text-[11px] text-neutral-500 block">Şu anki gidişle borçsuz</span>
          <span className="text-sm font-bold">{at(result.base.months - 1)}</span>
        </div>
        <div className={`rounded-xl p-3 ${saved > 0 ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' : 'bg-neutral-50 dark:bg-neutral-800/60'}`}>
          <span className={`text-[11px] block ${saved > 0 ? 'text-white/80' : 'text-neutral-500'}`}>Planla borçsuz</span>
          <span className="text-sm font-bold">
            {at(result.months - 1)}
            {saved > 0 && ` · ${saved} ay erken`}
          </span>
        </div>
      </div>

      {extra > 0 && result.interestSaved > 1 && (
        <p className="text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-3">
          Faiz kazancı: yaklaşık <b className="font-mono">{money(result.interestSaved)}</b> daha az ödersiniz.
        </p>
      )}

      <ul className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
        {debts.map((d) => {
          const m = result.done.get(d.id);
          const base = result.base.done.get(d.id);
          return (
            <li key={d.id} className="py-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={!excluded[d.id]}
                  onChange={(e) => setExcluded({ ...excluded, [d.id]: !e.target.checked })}
                  title="Erken ödenebilir mi?"
                />
                <span className="truncate text-neutral-800 dark:text-neutral-200">{d.title}</span>
                <span className="text-neutral-400 font-mono shrink-0">{money(d.balance)}</span>
              </label>
              <span className="shrink-0 font-semibold">
                {m !== undefined ? at(m) : '—'}
                {m !== undefined && base !== undefined && base > m && <span className="text-emerald-600 ml-1">(-{base - m} ay)</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-neutral-500">
        Fazladan para önce kalanı en az olan borca gider; o bitince onun taksiti de sıradakine eklenir (kartopu yöntemi). Erken
        ödenemeyen borçların (ör. Eminevim) işaretini kaldırın. Faiz oranı girilmiş kredilerde (taksiti düzenle → aylık faiz)
        erken kapatmanın faiz kazancı da hesaplanır; oranı girilmeyenler faizsiz sayılır.
      </p>
    </section>
  );
};

import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import type { InstallmentDebt } from '../../types/budget';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { monthLabel } from '../common/MonthSwitcher';
import { Rocket } from 'lucide-react';

interface Debt {
  id: string;
  title: string;
  balance: number;
  monthly: number;
  // Bu ayın taksiti ödendiyse ödemeler gelecek aydan başlar
  start: number;
}

const remainingOf = (i: InstallmentDebt) =>
  i.schedule ? i.schedule.filter((s) => !s.paid).reduce((s, x) => s + x.amount, 0) : (i.remainingInstallments ?? 0) * i.monthlyAmount;
const monthlyOf = (i: InstallmentDebt) => (i.schedule ? Math.max(0, ...i.schedule.filter((s) => !s.paid).map((s) => s.amount)) : i.monthlyAmount);

// Ay ay ödeme: her borç kendi taksitini öder; fazladan para (ve biten borçlardan boşa çıkan taksitler,
// "kartopu" yöntemi) kalanı en az olan borca gider. Faiz bilinmediği için faizsiz hesaplanır.
function simulate(debts: Debt[], extra: number) {
  const bal = new Map(debts.map((d) => [d.id, d.balance]));
  const done = new Map<string, number>();
  let month = 0;
  while ([...bal.values()].some((b) => b > 0.01) && month < 600) {
    let pool = extra;
    for (const d of debts) {
      const b = bal.get(d.id)!;
      if (month < d.start) continue;
      if (b <= 0.01) {
        if (extra > 0) pool += d.monthly; // biten borcun taksiti kartopuna eklenir
        continue;
      }
      const pay = Math.min(d.monthly, b);
      bal.set(d.id, b - pay);
      if (extra > 0) pool += d.monthly - pay;
    }
    // Fazladan parayı kalanı en az olan borçtan başlayarak dağıt
    const open = debts.filter((d) => bal.get(d.id)! > 0.01 && month >= d.start).sort((a, b) => bal.get(a.id)! - bal.get(b.id)!);
    for (const d of open) {
      if (pool <= 0) break;
      const b = bal.get(d.id)!;
      const pay = Math.min(pool, b);
      bal.set(d.id, b - pay);
      pool -= pay;
    }
    for (const d of debts) if (!done.has(d.id) && bal.get(d.id)! <= 0.01) done.set(d.id, month);
    month++;
  }
  return { months: month, done };
}

export const DebtPlanner: React.FC = () => {
  const { installments, currency, isInstallmentPaidThisMonth } = useBudget();
  const [extraText, setExtraText] = useState('');
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const extra = Number(extraText.replace(/\./g, '').replace(',', '.')) || 0;

  const debts = useMemo<Debt[]>(
    () =>
      installments
        .filter((i) => (i.schedule ? i.schedule.some((s) => !s.paid) : !!i.totalInstallments && (i.remainingInstallments ?? 0) > 0))
        .map((i) => ({ id: i.id, title: i.title, balance: remainingOf(i), monthly: monthlyOf(i), start: isInstallmentPaidThisMonth(i.id) ? 1 : 0 }))
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
    return { base, months: Math.max(plan.months, fixedPlan.months), done };
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
        ödenemeyen borçların (ör. Eminevim) işaretini kaldırın. Faiz bilinmediği için hesap faizsizdir; kredilerde erken kapatma
        ayrıca faiz indirimi sağlar.
      </p>
    </section>
  );
};

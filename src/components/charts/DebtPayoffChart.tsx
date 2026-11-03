import React, { useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import type { InstallmentDebt } from '../../types/budget';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { TrendingDown } from 'lucide-react';

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const HORIZON = 24;

// Bir taksitin önümüzdeki aylarda ödenecek tutarları (ay → tutar)
function futurePayments(i: InstallmentDebt, paidThisMonth: boolean): Map<string, number> {
  const out = new Map<string, number>();
  const now = monthKeyOf(new Date());
  if (i.schedule) {
    for (const s of i.schedule) if (!s.paid && s.date.slice(0, 7) >= now) out.set(s.date.slice(0, 7), (out.get(s.date.slice(0, 7)) ?? 0) + s.amount);
    return out;
  }
  const total = i.totalInstallments;
  const remaining = total ? i.remainingInstallments ?? 0 : HORIZON;
  // Bu ay ödendiyse kalanlar gelecek aydan başlar
  const start = paidThisMonth ? 1 : 0;
  for (let k = 0; k < Math.min(remaining, HORIZON); k++) out.set(shiftMonthKey(now, start + k), i.monthlyAmount);
  return out;
}

// Önümüzdeki 24 ayda aylık taksit yükünün nasıl azalacağı + toplam kalan borç
export const DebtPayoffChart: React.FC = () => {
  const { installments, transactions, currency } = useBudget();

  const data = useMemo(() => {
    const now = monthKeyOf(new Date());
    const months = Array.from({ length: HORIZON }, (_, k) => shiftMonthKey(now, k));
    const totals = new Map(months.map((m) => [m, 0]));
    let remainingDebt = 0;
    for (const i of installments) {
      const paid = transactions.some((t) => t.installmentInfo?.installmentId === i.id && t.date.startsWith(now));
      const future = futurePayments(i, paid);
      for (const [m, amount] of future) if (totals.has(m)) totals.set(m, (totals.get(m) ?? 0) + amount);
      // Kalan borç 24 ayla sınırlı değil: tüm ödenmemiş dönemler
      if (i.schedule) remainingDebt += i.schedule.filter((x) => !x.paid).reduce((s, x) => s + x.amount, 0);
      else if (i.totalInstallments) remainingDebt += (i.remainingInstallments ?? 0) * i.monthlyAmount;
    }
    const list = months.map((m) => ({ key: m, amount: totals.get(m) ?? 0 }));
    const debtFreeIndex = list.findIndex((x, idx) => x.amount === 0 && list.slice(idx).every((y) => y.amount === 0));
    return { list, remainingDebt, max: Math.max(1, ...list.map((x) => x.amount)), debtFree: debtFreeIndex >= 0 ? list[debtFreeIndex].key : null };
  }, [installments, transactions]);

  if (installments.length === 0) return null;
  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);
  const label = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
  };

  return (
    <section className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-sky-600" /> Taksit Yükü Önümüzdeki 24 Ay
        </h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-neutral-500 block">Kalan toplam taksit</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{money(data.remainingDebt)}</span>
          </div>
          <div>
            <span className="text-neutral-500 block">Taksitsiz ay</span>
            <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{data.debtFree ? label(data.debtFree) : '24 aydan sonra'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1 h-40" role="img" aria-label="Aylık taksit yükü grafiği">
        {data.list.map((x) => (
          <div key={x.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              className="w-full rounded-t bg-sky-500/80 group-hover:bg-sky-600"
              style={{ height: `${(x.amount / data.max) * 100}%`, minHeight: x.amount > 0 ? 2 : 0 }}
              title={`${label(x.key)}: ${money(x.amount)}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 text-[9px] text-neutral-400">
        {data.list.map((x, idx) => (
          <span key={x.key} className="flex-1 text-center">
            {idx % 3 === 0 ? label(x.key) : ''}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-neutral-500">
        Sütunlar her ay ödenecek toplam taksiti gösterir; üzerine gelince tutar görünür. Kredi faizleri bilinmediği için erken kapatma
        kazancı hesaplanmaz.
      </p>
    </section>
  );
};

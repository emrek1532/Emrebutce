import React, { useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { lastMonths, monthTotals, pctChange } from '../../utils/monthStats';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { cachedPrices, unitPrice } from '../../utils/assetPrices';
import { formatCurrency } from '../../utils/currencies';
import { MiniBars, Sparkline } from './Donut';
import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank, Wallet } from 'lucide-react';

interface Stat {
  label: string;
  value: number;
  sign?: boolean;
  change: number | null;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  chart: React.ReactNode;
}

// Genel Bakış'ın üstündeki dört renkli kutu: varlık/birikim, gelir, gider, kalan
export const StatCards: React.FC = () => {
  const { transactions, selectedMonth, assets, assetHistory } = useBudget();
  const money = (v: number) => formatCurrency(v, 'TRY');

  const stats = useMemo<Stat[]>(() => {
    const isCurrent = selectedMonth === monthKeyOf(new Date());
    const now = monthTotals(transactions, selectedMonth);
    // İçinde bulunulan ay, geçen ayın aynı gününe kadarki kısmıyla karşılaştırılır
    const prev = monthTotals(transactions, shiftMonthKey(selectedMonth, -1), isCurrent ? new Date().getDate() : undefined);
    const series = lastMonths(transactions, selectedMonth, 6);

    let first: Stat;
    if (assets.length > 0) {
      const prices = cachedPrices();
      const priced = assets.map((a) => {
        const p = unitPrice(a.kind, prices);
        return p === null ? null : p * a.amount;
      });
      const last = assetHistory[assetHistory.length - 1];
      const total = priced.every((v) => v !== null) ? priced.reduce((s: number, v) => s + (v ?? 0), 0) : last?.total ?? 0;
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const base = [...assetHistory].reverse().find((s) => s.id <= monthAgo) ?? assetHistory[0];
      const diff = base ? total - base.total : 0;
      first = {
        label: 'Toplam Varlıklarım',
        value: total,
        // Yüzde yuvarlanınca 0 çıkan küçük değişimde rozet gösterilmez (tutar alt satırda yazar)
        change: base ? pctChange(total, base.total) : null,
        sub: base && Math.abs(diff) >= 1 ? `Geçen aya göre ${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}` : 'Altın, döviz ve TL birikimi',
        icon: <Landmark className="w-5 h-5" />,
        gradient: 'from-sky-500 via-blue-600 to-indigo-700',
        chart: <Sparkline values={assetHistory.slice(-30).map((s) => s.total)} stroke="#ffffff" className="absolute right-0 bottom-0 w-1/2 h-14 opacity-40 sm:opacity-80" />
      };
    } else {
      first = {
        label: 'Bu Ay Birikim',
        value: now.saving,
        change: pctChange(now.saving, prev.saving),
        sub: now.income > 0 ? `Gelirin %${Math.round((now.saving / now.income) * 100)}'i` : undefined,
        icon: <PiggyBank className="w-5 h-5" />,
        gradient: 'from-sky-500 via-blue-600 to-indigo-700',
        chart: <MiniBars values={series.map((m) => m.saving)} className="absolute right-4 bottom-0 h-12" />
      };
    }
    return [
      first,
      {
        label: 'Toplam Gelir',
        value: now.income,
        change: pctChange(now.income, prev.income),
        icon: <ArrowUpRight className="w-5 h-5" />,
        gradient: 'from-emerald-400 to-teal-600',
        chart: <MiniBars values={series.map((m) => m.income)} className="absolute right-4 bottom-0 h-12" />
      },
      {
        label: 'Toplam Gider',
        value: now.expense,
        change: pctChange(now.expense, prev.expense),
        sub: now.card > 0 ? `+ kartla ${money(now.card)}` : undefined,
        icon: <ArrowDownRight className="w-5 h-5" />,
        gradient: 'from-rose-400 to-pink-600',
        chart: <MiniBars values={series.map((m) => m.expense)} className="absolute right-4 bottom-0 h-12" />
      },
      {
        label: 'Kalan Bakiye',
        value: now.balance,
        sign: true,
        change: pctChange(now.balance, prev.balance),
        sub: 'Gelir − gider − birikim',
        icon: <Wallet className="w-5 h-5" />,
        gradient: 'from-violet-500 to-purple-700',
        chart: <Sparkline values={series.map((m) => m.balance)} stroke="#ffffff" className="absolute right-0 bottom-0 w-1/2 h-12 opacity-40 sm:opacity-80" />
      }
    ];
  }, [transactions, selectedMonth, assets, assetHistory]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`relative overflow-hidden rounded-2xl p-3.5 sm:p-5 text-white shadow-sm bg-gradient-to-br ${s.gradient} min-h-[7.5rem] sm:min-h-[8.5rem]`}
        >
          <div className="absolute -right-10 -top-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          {s.chart}
          <div className="relative flex items-start justify-between gap-2">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">{s.icon}</div>
            {s.change !== null && s.change !== 0 && Math.abs(s.change) < 1000 && (
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 whitespace-nowrap" title="Geçen aya göre">
                {s.change >= 0 ? '↑' : '↓'} %{Math.abs(s.change)}
              </span>
            )}
          </div>
          <div className="relative mt-2 sm:mt-3">
            <span className="text-[11px] sm:text-xs font-medium text-white/85 block">{s.label}</span>
            <span className="text-lg sm:text-2xl lg:text-xl 2xl:text-2xl font-extrabold font-mono tracking-tight block truncate">
              {s.sign && s.value > 0 ? '+' : ''}
              {money(s.value)}
            </span>
            {s.sub && <span className="text-[10px] sm:text-[11px] text-white/80 block sm:truncate sm:max-w-[75%] leading-snug">{s.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

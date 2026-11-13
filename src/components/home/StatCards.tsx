import React, { useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { lastMonths, monthTotals, pctChange } from '../../utils/monthStats';
import { monthKeyOf, shiftMonthKey } from '../../utils/budgetMonth';
import { cachedPrices, unitPrice } from '../../utils/assetPrices';
import { formatCurrency } from '../../utils/currencies';
import { MiniBars, Sparkline } from './Donut';
import { useDrill } from '../../utils/drill';
import { setActiveTab } from '../../utils/activeTab';
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
  // Dokununca açılacak yer
  tap: () => void;
  hint: string;
}

// Genel Bakış'ın üstündeki dört renkli kutu: varlık/birikim, gelir, gider, kalan
export const StatCards: React.FC = () => {
  const { transactions, selectedMonth, assets, assetHistory } = useBudget();
  const drill = useDrill();
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
        chart: <Sparkline values={assetHistory.slice(-30).map((s) => s.total)} stroke="#ffffff" className="absolute right-0 bottom-0 w-1/2 h-14 opacity-40 sm:opacity-80" />,
        tap: () => setActiveTab('goals'),
        hint: 'Varlıklarını gör'
      };
    } else {
      first = {
        label: 'Bu Ay Birikim',
        value: now.saving,
        change: pctChange(now.saving, prev.saving),
        sub: now.income > 0 ? `Gelirin %${Math.round((now.saving / now.income) * 100)}'i` : undefined,
        icon: <PiggyBank className="w-5 h-5" />,
        gradient: 'from-sky-500 via-blue-600 to-indigo-700',
        chart: <MiniBars values={series.map((m) => m.saving)} className="absolute right-4 bottom-0 h-12" />,
        tap: () => drill({ type: 'saving' }),
        hint: 'Birikim işlemlerini gör'
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
        chart: <MiniBars values={series.map((m) => m.income)} className="absolute right-4 bottom-0 h-12" />,
        tap: () => drill({ type: 'income' }),
        hint: 'Gelirleri gör'
      },
      {
        label: 'Toplam Gider',
        value: now.expense,
        change: pctChange(now.expense, prev.expense),
        sub: now.card > 0 ? `+ kartla ${money(now.card)}` : undefined,
        icon: <ArrowDownRight className="w-5 h-5" />,
        gradient: 'from-rose-400 to-pink-600',
        chart: <MiniBars values={series.map((m) => m.expense)} className="absolute right-4 bottom-0 h-12" />,
        tap: () => drill({ type: 'expense' }),
        hint: 'Giderleri gör'
      },
      {
        label: 'Kalan Bakiye',
        value: now.balance,
        sign: true,
        change: pctChange(now.balance, prev.balance),
        sub: 'Gelir − gider − birikim',
        icon: <Wallet className="w-5 h-5" />,
        gradient: 'from-violet-500 to-purple-700',
        chart: <Sparkline values={series.map((m) => m.balance)} stroke="#ffffff" className="absolute right-0 bottom-0 w-1/2 h-12 opacity-40 sm:opacity-80" />,
        tap: () => drill(),
        hint: 'Bu ayın tüm işlemlerini gör'
      }
    ];
  }, [transactions, selectedMonth, assets, assetHistory]);

  return (
    <section aria-label="Finansal özet" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {stats.map((s, index) => {
        const featured = index === 0;
        const accents = ['text-white', 'text-emerald-700 dark:text-emerald-300', 'text-rose-700 dark:text-rose-300', 'text-sky-700 dark:text-sky-300'];
        const surfaces = ['bg-gradient-to-br from-[#07549c] via-[#086bb8] to-[#073d76]', 'bg-white dark:bg-neutral-900', 'bg-white dark:bg-neutral-900', 'bg-white dark:bg-neutral-900'];
        return (
          <button
            type="button"
            key={s.label}
            onClick={s.tap}
            title={s.hint}
            className={`group relative flex flex-col justify-between overflow-hidden text-left rounded-[1.35rem] p-3.5 sm:p-5 border min-h-[8.5rem] sm:min-h-[10rem] transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${surfaces[index]} ${featured ? 'border-blue-700 shadow-lg shadow-blue-900/15' : 'border-neutral-200 dark:border-neutral-800 shadow-sm'}`}
          >
            {featured && <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border-[24px] border-white/10 pointer-events-none" />}
            <div className="relative flex items-start justify-between gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${featured ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-neutral-800 ' + accents[index]}`}>{s.icon}</span>
              {s.change !== null && s.change !== 0 && Math.abs(s.change) < 1000 && (
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${featured ? 'bg-white/15 text-white' : 'bg-neutral-100 dark:bg-neutral-800 ' + accents[index]}`} title="Geçen aya göre">
                  {s.change >= 0 ? '↑' : '↓'} %{Math.abs(s.change)}
                </span>
              )}
            </div>
            <div className="relative mt-4 min-w-0">
              <span className={`block text-[11px] sm:text-xs font-semibold ${featured ? 'text-blue-100' : 'text-neutral-500 dark:text-neutral-400'}`}>{s.label}</span>
              <span className={`block mt-1 text-[clamp(0.95rem,1.7vw,1.5rem)] font-extrabold tracking-tight tabular-nums break-words leading-tight ${featured ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                {s.sign && s.value > 0 ? '+' : ''}{money(s.value)}
              </span>
              {s.sub && <span className={`mt-1.5 block text-[10px] sm:text-xs leading-snug ${featured ? 'text-blue-100/85' : 'text-neutral-500 dark:text-neutral-400'}`}>{s.sub}</span>}
            </div>
          </button>
        );
      })}
    </section>
  );
};

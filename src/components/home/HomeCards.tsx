import { useDrill } from '../../utils/drill';
import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { budgetMonthOf, monthKeyOf, shiftMonthKey, isSpending } from '../../utils/budgetMonth';
import { lastMonths, monthTotals, pctChange } from '../../utils/monthStats';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { txTone } from '../../utils/txStyle';
import { setActiveTab } from '../../utils/activeTab';
import { monthLabel } from '../common/MonthSwitcher';
import { BudgetPlanCard, useBudgetPlan } from '../common/BudgetPlanCard';
import { Donut, Sparkline } from './Donut';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Lightbulb,
  PieChart,
  PiggyBank,
  Target,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';

export const homeCard = 'rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs';
const money = (v: number) => formatCurrency(v, 'TRY');

const CardTitle: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
  <div className="flex items-center justify-between gap-2 mb-4">
    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 min-w-0">
      {icon}
      <span className="truncate">{title}</span>
    </h3>
    {action}
  </div>
);

const LinkBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0">
    {children} <ArrowRight className="w-3.5 h-3.5" />
  </button>
);

// Aylık Özet: gelirin gidere, birikime ve kalana nasıl bölündüğü + aylık denge
export const MonthSummaryCard: React.FC = () => {
  const { transactions, selectedMonth } = useBudget();
  const drill = useDrill();
  const { now, change, series } = useMemo(() => {
    const isCurrent = selectedMonth === monthKeyOf(new Date());
    const now = monthTotals(transactions, selectedMonth);
    const prev = monthTotals(transactions, shiftMonthKey(selectedMonth, -1), isCurrent ? new Date().getDate() : undefined);
    return { now, change: pctChange(now.balance, prev.balance), series: lastMonths(transactions, selectedMonth, 6).map((m) => m.balance) };
  }, [transactions, selectedMonth]);
  const rest = Math.max(0, now.balance);
  const rows: [string, number, string][] = [
    ['Gelir', now.income, '#3B82F6'],
    ['Gider', now.expense, '#F43F5E'],
    ['Birikim', now.saving, '#F59E0B'],
    ['Kalan', rest, '#10B981']
  ];
  const up = now.balance >= 0;
  return (
    <div className={`${homeCard} p-5 @container`}>
      <CardTitle
        icon={<BarChart3 className="w-5 h-5 text-sky-600" />}
        title="Aylık Özet"
        action={<span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">{monthLabel(selectedMonth)}</span>}
      />
      <div className="grid grid-cols-1 @md:grid-cols-[auto_1fr] @3xl:grid-cols-[auto_1fr_13rem] items-center gap-5">
        <Donut
          size={168}
          stroke={24}
          segments={[
            { value: now.expense, color: '#F43F5E' },
            { value: now.saving, color: '#F59E0B' },
            { value: rest, color: '#10B981' }
          ]}
        >
          <span className="text-base font-extrabold font-mono text-neutral-900 dark:text-neutral-100">{money(now.income)}</span>
          <span className="text-[11px] text-neutral-500">Gelir</span>
        </Donut>
        <ul className="w-full @md:max-w-sm min-w-0 space-y-2.5 justify-self-center">
          {rows.map(([label, value, color]) => (
            <li
              key={label}
              className="flex items-center justify-between gap-3 text-sm cursor-pointer rounded-lg -mx-1.5 px-1.5 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              onClick={() => drill(label === 'Gelir' ? { type: 'income' } : label === 'Gider' ? { type: 'expense' } : label === 'Birikim' ? { type: 'saving' } : {})}
            >
              <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <i className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {label}
              </span>
              <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{money(value)}</span>
            </li>
          ))}
          {now.card > 0 && <li className="text-[11px] text-neutral-400">Kartla {money(now.card)} harcandı; ekstre ödenince gidere girer.</li>}
        </ul>
        <div className="w-full @md:col-span-2 @3xl:col-span-1 rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 p-4 text-center">
          <span className="text-xs font-medium text-neutral-500 flex items-center justify-center gap-1">
            {up ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />} Aylık Denge
          </span>
          <span className={`block text-xl font-extrabold font-mono mt-1 ${up ? 'text-neutral-900 dark:text-neutral-100' : 'text-rose-600'}`}>
            {now.balance > 0 ? '+' : ''}
            {money(now.balance)}
          </span>
          {change !== null && Math.abs(change) < 1000 && (
            <span
              className={`inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                change >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {change >= 0 ? '↑' : '↓'} %{Math.abs(change)} geçen aya göre
            </span>
          )}
          <Sparkline values={series} stroke="#3B82F6" className="w-full h-10 mt-2" />
        </div>
      </div>
    </div>
  );
};

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#94A3B8'];

// Harcama Dağılımı: en çok harcanan 4 kategori + diğer (kartla yapılanlar dahil)
export const SpendingCard: React.FC = () => {
  const { transactions, selectedMonth } = useBudget();
  const drill = useDrill();
  const { slices, total } = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (!isSpending(t) || budgetMonthOf(t) !== selectedMonth) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + convertCurrency(t.amount, t.currency, 'TRY'));
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, sorted.length > 5 ? 4 : 5);
    const other = sorted.slice(top.length).reduce((s, [, v]) => s + v, 0);
    const slices = [...top, ...(other > 0 ? ([['Diğer', other]] as [string, number][]) : [])];
    return { slices, total: sorted.reduce((s, [, v]) => s + v, 0) };
  }, [transactions, selectedMonth]);
  return (
    <div className={`${homeCard} p-5 h-full @container`}>
      <CardTitle icon={<PieChart className="w-5 h-5 text-sky-600" />} title="Harcama Dağılımı" action={<LinkBtn onClick={() => setActiveTab('reports')}>Raporlar</LinkBtn>} />
      {total === 0 ? (
        <p className="text-xs text-neutral-500 py-6 text-center">Bu ay harcama yok.</p>
      ) : (
        <div className="flex flex-col @md:flex-row items-center gap-4">
          <Donut size={128} stroke={20} segments={slices.map(([, v], i) => ({ value: v, color: PALETTE[i % PALETTE.length] }))}>
            <span className="text-sm font-extrabold font-mono text-neutral-900 dark:text-neutral-100">{money(total)}</span>
            <span className="text-[10px] text-neutral-500">Gider (kart dahil)</span>
          </Donut>
          <ul className="flex-1 w-full min-w-0 space-y-2">
            {slices.map(([cat, v], i) => (
              <li
                key={cat}
                className={`flex items-center gap-2 text-xs rounded-lg -mx-1.5 px-1.5 py-1 ${cat === 'Diğer' && slices.length > 5 ? '' : 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60'}`}
                onClick={() => (cat === 'Diğer' && slices.length > 5 ? drill({ type: 'expense' }) : drill({ type: 'expense', category: cat }))}
                title="Bu kategorinin harcamalarını gör"
              >
                <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="flex-1 min-w-0 truncate text-neutral-700 dark:text-neutral-300">{cat}</span>
                <span className="text-neutral-400 font-mono w-9 text-right">%{Math.round((v / total) * 100)}</span>
                <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{money(v)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Akıllı Öneri: bu ay harcanabilecek tutar + duruma göre tek bir öneri
export const SmartTipCard: React.FC = () => {
  const { transactions, selectedMonth, categoryLimits, categorySpendingMap } = useBudget();
  const { plan, isPast } = useBudgetPlan();
  const [open, setOpen] = useState(false);

  const tip = useMemo(() => {
    const over = categoryLimits
      .map((l) => ({ l, spent: categorySpendingMap[l.category] || 0, limit: convertCurrency(l.monthlyLimit, l.currency, 'TRY') }))
      .filter((x) => x.limit > 0)
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0];
    if (!isPast && over && over.spent >= over.limit)
      return `${over.l.category} sınırını aştın (${money(over.spent)} / ${money(over.limit)}). Ay sonuna kadar bu kategoride harcamayı durdurmayı düşün.`;
    if (!isPast && over && (over.spent / over.limit) * 100 >= over.l.alertThresholdPercent)
      return `${over.l.category} sınırının %${Math.round((over.spent / over.limit) * 100)}'ine geldin; kalan ${money(over.limit - over.spent)}.`;

    // Geçen ayın aynı gününe göre en çok artan kategori
    const isCurrent = selectedMonth === monthKeyOf(new Date());
    const prevKey = shiftMonthKey(selectedMonth, -1);
    const cut = isCurrent ? new Date().getDate() : 31;
    const sum = (key: string, c?: number) => {
      const m = new Map<string, number>();
      for (const t of transactions) {
        if (!isSpending(t) || budgetMonthOf(t) !== key) continue;
        if (c && t.date.slice(0, 7) === key && Number(t.date.slice(8, 10)) > c) continue;
        m.set(t.category, (m.get(t.category) ?? 0) + convertCurrency(t.amount, t.currency, 'TRY'));
      }
      return m;
    };
    const now = sum(selectedMonth);
    const before = sum(prevKey, cut);
    const rise = [...now.entries()]
      .map(([c, v]) => ({ c, v, b: before.get(c) ?? 0 }))
      .filter((x) => x.b > 0 && x.v - x.b >= 500 && x.v / x.b >= 1.1)
      .sort((a, b) => b.v - b.b - (a.v - a.b))[0];
    if (rise)
      return `${rise.c} harcaman geçen aya göre %${Math.round((rise.v / rise.b - 1) * 100)} arttı (+${money(rise.v - rise.b)}). Bu kalemi kontrol ederek tasarruf edebilirsin.`;

    if (isPast) return plan.free >= 0 ? `Bu ay ${money(plan.free)} artırdın.` : `Bu ay giderler geliri ${money(-plan.free)} aştı.`;
    const suggestion = Math.floor((plan.free * 0.3) / 500) * 500;
    if (plan.saved === 0 && suggestion >= 500) return `Bu ay ${money(suggestion)} birikime ayırabilirsin (serbest kalanın ~%30'u). Detaylardan tek tuşla ayır.`;
    if (plan.free < 0) return `Planlanan ödemeler beklenen geliri ${money(-plan.free)} aşıyor. Kart ekstresinde asgariden fazlasını ödemeyi erteleyebilirsin.`;
    return `Günde ${money(plan.daily)} ile ayı rahat kapatırsın.`;
  }, [categoryLimits, categorySpendingMap, transactions, selectedMonth, plan, isPast]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-sky-950/30 p-5 shadow-xs">
      <div className="absolute -right-10 -bottom-12 w-40 h-40 rounded-full bg-emerald-200/40 dark:bg-emerald-800/20 pointer-events-none" />
      <div className="relative">
        <CardTitle icon={<Lightbulb className="w-5 h-5 text-emerald-600" />} title="Akıllı Öneri" />
        <span className="text-[11px] font-medium text-neutral-500 block">{isPast ? 'Aydan artan' : 'Bu ay harcayabileceğin'}</span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-2xl font-extrabold font-mono ${plan.free >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>{money(plan.free)}</span>
          {!isPast && plan.free > 0 && <span className="text-xs text-neutral-500 font-mono">günlük {money(plan.daily)}</span>}
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 leading-relaxed">{tip}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
        >
          Detayları Gör <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2 px-2 sm:px-0">
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full bg-white dark:bg-neutral-800 shadow" title="Kapat">
                <X className="w-4 h-4" />
              </button>
            </div>
            <BudgetPlanCard defaultOpen />
          </div>
        </div>
      )}
    </div>
  );
};

// Son İşlemler
export const RecentCard: React.FC<{ onEditTx: (tx: Transaction) => void }> = ({ onEditTx }) => {
  const { filteredTransactions } = useBudget();
  return (
    <div className={`${homeCard} p-5 h-full`}>
      <CardTitle
        icon={<Clock className="w-5 h-5 text-sky-600" />}
        title="Son İşlemler"
        action={<LinkBtn onClick={() => setActiveTab('transactions')}>Tümünü Gör ({filteredTransactions.length})</LinkBtn>}
      />
      {filteredTransactions.length === 0 ? (
        <p className="text-xs text-neutral-500 py-2">Bu ay işlem yok.</p>
      ) : (
        <ul className="space-y-1">
          {filteredTransactions.slice(0, 5).map((tx) => {
            const tone = txTone(tx.type);
            return (
              <li
                key={tx.id}
                onClick={() => onEditTx(tx)}
                className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone.badge}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : tx.type === 'saving' ? <PiggyBank className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{tx.description}</p>
                    <span className="text-[11px] text-neutral-400">
                      {tx.date.split('-').reverse().slice(0, 2).join('.')} · {tx.category}
                    </span>
                  </div>
                </div>
                <span className={`text-sm font-bold font-mono shrink-0 ${tone.text}`}>
                  {tone.sign}
                  {money(convertCurrency(tx.amount, tx.currency, 'TRY'))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// Alt şerit: en yakın birikim hedefi (yoksa hedef ekleme çağrısı)
export const GoalBanner: React.FC = () => {
  const { savingsGoals } = useBudget();
  const goal = [...savingsGoals]
    .map((g) => ({ g, saved: convertCurrency(g.currentAmount, g.currency, 'TRY'), target: convertCurrency(g.targetAmount, g.currency, 'TRY') }))
    .filter((x) => x.target > 0 && x.saved < x.target)
    .sort((a, b) => b.saved / b.target - a.saved / a.target)[0];
  const pct = goal ? Math.round((goal.saved / goal.target) * 100) : 0;
  return (
    <div className={`${homeCard} p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-rose-500" />
        </div>
        <span className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
          {goal ? (
            <>
              {goal.g.title} hedefine <span className="font-mono">{money(goal.target - goal.saved)}</span> kaldı!
            </>
          ) : savingsGoals.length > 0 ? (
            'Tüm birikim hedeflerine ulaştın 🎉'
          ) : (
            'Bir birikim hedefi belirle, ilerlemeni burada gör.'
          )}
        </span>
      </div>
      {goal && (
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-bold font-mono text-neutral-900 dark:text-neutral-100">%{pct}</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setActiveTab('goals')}
        className="sm:ml-auto shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-50 dark:hover:bg-sky-950/40"
      >
        {goal ? 'Hedef Detayları' : savingsGoals.length > 0 ? 'Hedeflere bak' : 'Hedef Ekle'} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

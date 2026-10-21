import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { CashFlowTrendChart } from '../charts/CashFlowTrendChart';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import {
  TrendingUp,
  PieChart,
  Users,
  CreditCard,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    transactions,
    currency,
    familyMembers,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance,
    savingsRate
  } = useBudget();

  // Current month prefix
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const dailyAverageExpense = currentDay > 0 ? monthlyExpense / currentDay : 0;
  const projectedMonthEndExpense = dailyAverageExpense * daysInMonth;

  // Member spending distribution
  const memberSpending: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.date.startsWith(currentMonthPrefix)) {
      const val = convertCurrency(tx.amount, tx.currency, currency);
      memberSpending[tx.member] = (memberSpending[tx.member] || 0) + val;
    }
  });

  // Payment method distribution
  const paymentMethodMap: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.date.startsWith(currentMonthPrefix)) {
      const val = convertCurrency(tx.amount, tx.currency, currency);
      paymentMethodMap[tx.paymentMethod] = (paymentMethodMap[tx.paymentMethod] || 0) + val;
    }
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tasarruf Oranı */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Aylık Tasarruf Oranı
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              %{savingsRate}
            </span>
            <span className="text-xs text-neutral-500">hedef %25</span>
          </div>
          <span className="text-[11px] text-neutral-400 block mt-1">
            Gelirin birikime ayrılan payı
          </span>
        </div>

        {/* Günlük Ortalama Gider */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Günlük Ortalama Gider
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatCurrency(dailyAverageExpense, currency)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 block mt-1">
            Ayın ilk {currentDay} gününe göre
          </span>
        </div>

        {/* Tahmini Ay Sonu Harcaması */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Tahmini Ay Sonu Gideri
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatCurrency(projectedMonthEndExpense, currency)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 block mt-1">
            Mevcut harcama hızıyla
          </span>
        </div>

        {/* Net Nakit Akışı */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
            Net Hane Bakiyesi
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
              monthlyBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance, currency)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 block mt-1">
            Gelir - Gider farkı
          </span>
        </div>
      </div>

      {/* Main Charts: Category Donut + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Kategori Bazlı Harcama Dağılımı
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              Bu Ay
            </span>
          </div>

          <CategoryDonutChart />
        </div>

        {/* Monthly Cash Flow Trend */}
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Aylık Gelir & Gider Karşılaştırması
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              Son 6 Ay
            </span>
          </div>

          <CashFlowTrendChart />
        </div>
      </div>

      {/* Secondary Analytics: Family Member spending & Payment method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Family Member distribution */}
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Aile Üyesi Harcama Dağılımı
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(memberSpending)
              .sort((a, b) => b[1] - a[1])
              .map(([member, amount]) => {
                const percent = monthlyExpense > 0 ? (amount / monthlyExpense) * 100 : 0;
                return (
                  <div key={member} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{member}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-neutral-400">%{percent.toFixed(1)}</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(amount, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Ödeme Yöntemi Tercihleri
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(paymentMethodMap)
              .sort((a, b) => b[1] - a[1])
              .map(([method, amount]) => {
                const percent = monthlyExpense > 0 ? (amount / monthlyExpense) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{method}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-neutral-400">%{percent.toFixed(1)}</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(amount, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

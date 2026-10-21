import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { SavingsGoalCard } from '../charts/SavingsGoalCard';
import { AddGoalModal } from '../modals/AddGoalModal';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { Target, Plus, PiggyBank, Sparkles, TrendingUp } from 'lucide-react';

export const GoalsView: React.FC = () => {
  const { savingsGoals, currency } = useBudget();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Overall totals
  let totalSaved = 0;
  let totalTarget = 0;

  savingsGoals.forEach((g) => {
    totalSaved += convertCurrency(g.currentAmount, g.currency, currency);
    totalTarget += convertCurrency(g.targetAmount, g.currency, currency);
  });

  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const remainingTotal = Math.max(0, totalTarget - totalSaved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Aile Tasarruf & Birikim Hedefleri</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Gelecek planlarınız, tatil ve acil durum fonlarınız için hedefler belirleyin ve ilerlemenizi takip edin.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Tasarruf Hedefi</span>
        </button>
      </div>

      {/* Aggregate Progress Banner */}
      <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Genel Birikim İlerlemesi
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                {formatCurrency(totalSaved, currency)}
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                / {formatCurrency(totalTarget, currency)} hedef
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[11px] text-neutral-400 block">Kalan İhtiyaç</span>
              <span className="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                {formatCurrency(remainingTotal, currency)}
              </span>
            </div>

            <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
              %{overallPercent}
            </div>
          </div>
        </div>

        {/* Linear progress */}
        <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {savingsGoals.map((goal) => (
          <SavingsGoalCard key={goal.id} goal={goal} />
        ))}
      </div>

      {/* Modal */}
      <AddGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

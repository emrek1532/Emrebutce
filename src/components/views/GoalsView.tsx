import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { SavingsGoalCard } from '../charts/SavingsGoalCard';
import { AddGoalModal } from '../modals/AddGoalModal';
import { AssetsSection } from './AssetsSection';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { Target, Plus } from 'lucide-react';

// Birikim sekmesi: önce elde olan varlıklar, sonra birikim hedefleri
export const GoalsView: React.FC = () => {
  const { savingsGoals, currency } = useBudget();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalSaved = savingsGoals.reduce((s, g) => s + convertCurrency(g.currentAmount, g.currency, currency), 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + convertCurrency(g.targetAmount, g.currency, currency), 0);
  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const remainingTotal = Math.max(0, totalTarget - totalSaved);

  return (
    <div className="space-y-6">
      <AssetsSection />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" /> Birikim Hedefleri
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100"
          >
            <Plus className="w-4 h-4" /> Hedef Ekle
          </button>
        </div>

        {savingsGoals.length === 0 ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full p-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center hover:bg-white dark:hover:bg-neutral-900"
          >
            <span className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">İlk hedefini ekle</span>
            <span className="block text-xs text-neutral-500 mt-1">Tatil, acil durum fonu, araba… Hedef koyunca ne kadar kaldığını burada ve ana sayfada görürsün.</span>
          </button>
        ) : (
          <>
            <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">Toplam ilerleme</span>
                  <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">{formatCurrency(totalSaved, currency)}</span>
                  <span className="text-xs text-neutral-500 font-mono ml-2">/ {formatCurrency(totalTarget, currency)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">Kalan</span>
                  <span className="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-300">{formatCurrency(remainingTotal, currency)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full" style={{ width: `${overallPercent}%` }} />
                </div>
                <span className="text-sm font-bold font-mono text-sky-600 dark:text-sky-400">%{overallPercent}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savingsGoals.map((goal) => (
                <SavingsGoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </>
        )}
      </section>

      <AddGoalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CategoryLimit } from '../../types/budget';
import { BudgetProgressCard } from '../charts/BudgetProgressCard';
import { SetLimitModal } from '../modals/SetLimitModal';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { Sliders, Plus, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const LimitsView: React.FC = () => {
  const { categoryLimits, categorySpendingMap, currency } = useBudget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState<CategoryLimit | null>(null);

  // Calculate status counts
  let safeCount = 0;
  let warnCount = 0;
  let exceededCount = 0;
  let totalLimitBudget = 0;
  let totalSpentBudgeted = 0;

  categoryLimits.forEach((lim) => {
    const limitConverted = convertCurrency(lim.monthlyLimit, lim.currency, currency);
    const spent = categorySpendingMap[lim.category] || 0;
    totalLimitBudget += limitConverted;
    totalSpentBudgeted += spent;

    const percent = limitConverted > 0 ? (spent / limitConverted) * 100 : 0;
    if (percent >= 100) exceededCount++;
    else if (percent >= lim.alertThresholdPercent) warnCount++;
    else safeCount++;
  });

  const handleEdit = (limit: CategoryLimit) => {
    setSelectedLimit(limit);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedLimit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <span>Kategori Harcama Limitleri & Erken Uyarılar</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Belirlediğiniz eşiklere ulaşıldığında anında sistem uyarı bildirimleri üretilir.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kategori Limiti</span>
        </button>
      </div>

      {/* Status Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-0.5">
            Toplam Bütçe Tavanı
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatCurrency(totalLimitBudget, currency)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Güvenli Bölge
            </span>
            <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
              {safeCount} Kategori
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
              Eşiğe Yakın
            </span>
            <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300">
              {warnCount} Kategori
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400 block mb-0.5">
              Limit Aşıldı
            </span>
            <span className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">
              {exceededCount} Kategori
            </span>
          </div>
          <AlertOctagon className="w-5 h-5 text-rose-500 opacity-80" />
        </div>
      </div>

      {/* Grid of Limit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryLimits.map((limit) => (
          <BudgetProgressCard
            key={limit.id}
            limit={limit}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {/* Modal */}
      <SetLimitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLimit(null);
        }}
        editLimit={selectedLimit}
      />
    </div>
  );
};

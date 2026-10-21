import React, { useState } from 'react';
import { SavingsGoal } from '../../types/budget';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { Target, Plus, CheckCircle, Calendar, Trash2 } from 'lucide-react';

interface Props {
  goal: SavingsGoal;
  onEdit?: (goal: SavingsGoal) => void;
}

export const SavingsGoalCard: React.FC<Props> = ({ goal, onEdit }) => {
  const { depositToGoal, deleteSavingsGoal, currency } = useBudget();
  const [showDepositInput, setShowDepositInput] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const currentConverted = convertCurrency(goal.currentAmount, goal.currency, currency);
  const targetConverted = convertCurrency(goal.targetAmount, goal.currency, currency);
  const percent = targetConverted > 0 ? Math.min(100, Math.round((currentConverted / targetConverted) * 100)) : 0;
  const isCompleted = currentConverted >= targetConverted;

  // Days remaining calculation
  const targetDateObj = new Date(goal.targetDate);
  const today = new Date();
  const diffTime = targetDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (!isNaN(val) && val > 0) {
      // Convert entered amount from display currency to goal currency
      const amountInGoalCur = convertCurrency(val, currency, goal.currency);
      depositToGoal(goal.id, amountInGoalCur);
      setDepositAmount('');
      setShowDepositInput(false);
    }
  };

  return (
    <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
      <div>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {goal.title}
              </h4>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {goal.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              %{percent}
            </span>
            <button
              onClick={() => {
                if (confirm(`"${goal.title}" hedefini silmek istediğinize emin misiniz?`)) {
                  deleteSavingsGoal(goal.id);
                }
              }}
              className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
              title="Hedefi Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden my-3">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              backgroundColor: isCompleted ? '#10B981' : goal.color
            }}
          />
        </div>

        {/* Amounts */}
        <div className="flex items-baseline justify-between text-xs font-mono tabular-nums mb-3">
          <div>
            <span className="text-neutral-400 text-[11px] block">Biriken</span>
            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(currentConverted, currency)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-neutral-400 text-[11px] block">Hedef Tutar</span>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {formatCurrency(targetConverted, currency)}
            </span>
          </div>
        </div>

        {goal.notes && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 italic mb-3">
            "{goal.notes}"
          </p>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>{goal.targetDate}</span>
          </div>
          <span className={diffDays < 0 ? 'text-neutral-400' : 'text-neutral-700 dark:text-neutral-300 font-medium'}>
            {isCompleted
              ? 'Tamamlandı ✨'
              : diffDays < 0
              ? 'Süre doldu'
              : `${diffDays} gün kaldı`}
          </span>
        </div>

        {/* Deposit Quick Form */}
        {showDepositInput ? (
          <form onSubmit={handleDepositSubmit} className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder={`Tutar (${currency})`}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setShowDepositInput(false)}
              className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              İptal
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowDepositInput(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tasarruf Ekle</span>
          </button>
        )}
      </div>
    </div>
  );
};

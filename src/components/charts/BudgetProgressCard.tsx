import React from 'react';
import { CategoryLimit } from '../../types/budget';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { AlertTriangle, CheckCircle2, AlertOctagon, Edit3 } from 'lucide-react';

interface Props {
  limit: CategoryLimit;
  onEdit?: (limit: CategoryLimit) => void;
}

export const BudgetProgressCard: React.FC<Props> = ({ limit, onEdit }) => {
  const { categorySpendingMap, currency } = useBudget();

  // Spent in current display currency
  const spent = categorySpendingMap[limit.category] || 0;
  // Limit converted to current currency
  const limitConverted = convertCurrency(limit.monthlyLimit, limit.currency, currency);

  const percent = limitConverted > 0 ? (spent / limitConverted) * 100 : 0;
  const isExceeded = percent >= 100;
  const isWarning = percent >= limit.alertThresholdPercent && !isExceeded;
  const remaining = limitConverted - spent;

  // Determine progress color
  let barColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
  let statusText = 'Güvenli Bölge';
  let StatusIcon = CheckCircle2;

  if (isExceeded) {
    barColor = 'bg-rose-500';
    badgeColor = 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 animate-pulse';
    statusText = 'Limit Aşıldı!';
    StatusIcon = AlertOctagon;
  } else if (isWarning) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
    statusText = `%${Math.round(percent)} Kritik Eşik`;
    StatusIcon = AlertTriangle;
  }

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isExceeded
        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
        : isWarning
        ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10'
        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: limit.color }} />
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {limit.category}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border ${badgeColor}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusText}</span>
          </span>

          {onEdit && (
            <button
              onClick={() => onEdit(limit)}
              title="Limiti Düzenle"
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden my-2.5">
        <div
          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* Metrics Row */}
      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
        <div>
          <span className="text-neutral-500 dark:text-neutral-400">Harcanan: </span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {formatCurrency(spent, currency)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-neutral-500 dark:text-neutral-400">Limit: </span>
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            {formatCurrency(limitConverted, currency)}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
        <span className="text-neutral-400">
          Eşik Bildirimi: %{limit.alertThresholdPercent}
        </span>
        <span className={`font-mono font-medium ${isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-600 dark:text-neutral-300'}`}>
          {isExceeded
            ? `${formatCurrency(Math.abs(remaining), currency)} Aşıldı`
            : `${formatCurrency(remaining, currency)} Kalan`}
        </span>
      </div>
    </div>
  );
};

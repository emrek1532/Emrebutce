import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency, convertCurrency } from '../../utils/currencies';

interface CategorySlice {
  category: string;
  amount: number;
  color: string;
  percent: number;
  startAngle: number;
  endAngle: number;
}

const PALETTE = [
  '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899',
  '#06B6D4', '#EF4444', '#14B8A6', '#6366F1', '#84CC16', '#64748B'
];

export const CategoryDonutChart: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { filteredTransactions, currency, categoryLimits } = useBudget();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Calculate expenses by category from filteredTransactions
  const expenseMap: Record<string, number> = {};
  let totalExpense = 0;

  filteredTransactions.forEach((tx) => {
    if (tx.type === 'expense') {
      const val = convertCurrency(tx.amount, tx.currency, currency);
      expenseMap[tx.category] = (expenseMap[tx.category] || 0) + val;
      totalExpense += val;
    }
  });

  const categoryEntries = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);

  // Compute angles
  let cumulativeAngle = 0;
  const slices: CategorySlice[] = categoryEntries.map(([category, amount], idx) => {
    const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
    const sliceAngle = totalExpense > 0 ? (amount / totalExpense) * 360 : 0;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const matchedLimit = categoryLimits.find((l) => l.category === category);
    const color = matchedLimit?.color || PALETTE[idx % PALETTE.length];

    return {
      category,
      amount,
      color,
      percent,
      startAngle,
      endAngle
    };
  });

  const size = compact ? 220 : 280;
  const strokeWidth = compact ? 36 : 42;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (totalExpense === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400 mb-3">
          ₺
        </div>
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Bu filtrede harcama kaydı bulunamadı.</p>
        <span className="text-xs text-neutral-400 mt-1">İşlem ekleyerek veya filtreleri temizleyerek inceleyebilirsiniz.</span>
      </div>
    );
  }

  const activeSlice = hoveredCategory ? slices.find((s) => s.category === hoveredCategory) : null;

  return (
    <div className={`flex ${compact ? 'flex-col items-center' : 'flex-col md:flex-row items-center gap-8'} w-full`}>
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {slices.map((slice) => {
            const strokeDashoffset = circumference - (circumference * (slice.endAngle - slice.startAngle)) / 360;
            const rotation = slice.startAngle;
            const isHovered = hoveredCategory === slice.category;

            return (
              <circle
                key={slice.category}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                style={{
                  transformOrigin: 'center',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'stroke-width 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
                  opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredCategory(slice.category)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            );
          })}
        </svg>

        {/* Center Info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate max-w-[140px]">
            {activeSlice ? activeSlice.category : 'Toplam Gider'}
          </span>
          <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-mono tabular-nums">
            {formatCurrency(activeSlice ? activeSlice.amount : totalExpense, currency)}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            {activeSlice ? `%${activeSlice.percent.toFixed(1)} pay` : `${slices.length} kategori`}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full flex-1 max-h-64 overflow-y-auto space-y-2 pr-1">
        {slices.map((slice) => {
          const isHovered = hoveredCategory === slice.category;
          return (
            <button
              key={slice.category}
              type="button"
              onClick={() => setHoveredCategory(hoveredCategory === slice.category ? null : slice.category)}
              onMouseEnter={() => setHoveredCategory(slice.category)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                isHovered
                  ? 'bg-neutral-100 dark:bg-neutral-800'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {slice.category}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums text-right">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                  %{slice.percent.toFixed(1)}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(slice.amount, currency)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

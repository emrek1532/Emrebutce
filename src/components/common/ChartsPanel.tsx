import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { CashFlowTrendChart } from '../charts/CashFlowTrendChart';
import { monthLabel } from './MonthSwitcher';

const card = 'p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs';

// İşlemler sekmesinin altındaki grafikler (Özet'ten taşındı)
export const ChartsPanel: React.FC = () => {
  const { selectedMonth } = useBudget();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className={card}>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Harcama dağılımı · {monthLabel(selectedMonth)}</h3>
        <CategoryDonutChart compact />
      </div>
      <div className={card}>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Son 6 ay gelir / gider</h3>
        <CashFlowTrendChart />
      </div>
    </div>
  );
};

import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { monthKeyOf } from '../../utils/budgetMonth';
import { UpcomingPayments } from './UpcomingPayments';
import { AskBox } from './AskBox';
import { StatCards } from '../home/StatCards';
import { MonthSelect } from '../home/MonthSelect';
import { GoalBanner, MonthSummaryCard, RecentCard, SmartTipCard, SpendingCard } from '../home/HomeCards';

// Genel Bakış: üstte dört renkli kutu, altında özet / ödemeler / dağılım / öneri / son işlemler / hedef
export const OverviewPanel: React.FC<{ onEditTx: (tx: Transaction) => void }> = ({ onEditTx }) => {
  const { selectedMonth } = useBudget();
  const isCurrent = selectedMonth === monthKeyOf(new Date());

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="sm:hidden flex">
        <MonthSelect />
      </div>
      <StatCards />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className={isCurrent ? 'xl:col-span-7' : 'xl:col-span-12'}>
          <MonthSummaryCard />
        </div>
        {isCurrent && (
          <div className="xl:col-span-5">
            <UpcomingPayments />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <SpendingCard />
        <SmartTipCard />
        <div className="md:col-span-2 xl:col-span-1">
          <RecentCard onEditTx={onEditTx} />
        </div>
      </div>
      <GoalBanner />
      {isCurrent && (
        <div className="sm:hidden">
          <AskBox />
        </div>
      )}
    </div>
  );
};

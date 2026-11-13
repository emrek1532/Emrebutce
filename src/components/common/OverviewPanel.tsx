import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { monthKeyOf } from '../../utils/budgetMonth';
import { setActiveTab } from '../../utils/activeTab';
import { BookOpen } from 'lucide-react';
import { UpcomingPayments } from './UpcomingPayments';
import { AskBox } from './AskBox';
import { StatCards } from '../home/StatCards';
import { MonthSelect } from '../home/MonthSelect';
import { GoalBanner, MonthSummaryCard, RecentCard, SmartTipCard, SpendingCard } from '../home/HomeCards';

// Genel Bakış: üstte dört renkli kutu, altında özet / ödemeler / dağılım / öneri / son işlemler / hedef
export const OverviewPanel: React.FC<{ onEditTx: (tx: Transaction) => void }> = ({ onEditTx }) => {
  const { selectedMonth, transactions } = useBudget();
  const isCurrent = selectedMonth === monthKeyOf(new Date());

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="sm:hidden flex">
        <MonthSelect />
      </div>
      {transactions.length < 10 && (
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 text-left"
        >
          <BookOpen className="w-5 h-5 text-sky-600 shrink-0" />
          <span className="flex-1 text-sm text-sky-900 dark:text-sky-200">
            <b>Yeni misin?</b> Neyi nereye gireceğini ve rakamların nasıl hesaplandığını kılavuzda anlattık.
          </span>
          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 shrink-0">Kılavuz →</span>
        </button>
      )}
      <StatCards />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-5 items-start">
        <div className={isCurrent ? 'xl:col-span-7' : 'xl:col-span-12'}>
          <MonthSummaryCard />
        </div>
        {isCurrent && (
          <div className="xl:col-span-5">
            <UpcomingPayments />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
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

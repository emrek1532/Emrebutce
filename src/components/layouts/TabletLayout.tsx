import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab, Transaction } from '../../types/budget';
import { HeaderBar } from '../common/HeaderBar';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { GoalsView } from '../views/GoalsView';
import { InstallmentsView } from '../views/InstallmentsView';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { BudgetPlanCard } from '../common/BudgetPlanCard';
import { OverviewPanel } from '../common/OverviewPanel';
import { ChartsPanel } from '../common/ChartsPanel';
import { MonthSwitcher, monthLabel } from '../common/MonthSwitcher';
import { monthKeyOf } from '../../utils/budgetMonth';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Sliders,
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Users,
  AlertTriangle,
  CreditCard,
  Sparkles,
  Camera
} from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
  onOpenReceiptScanner?: () => void;
}

export const TabletLayout: React.FC<Props> = ({
  onOpenSync,
  onOpenNotifications,
  onOpenShare,
  onOpenReceiptScanner
}) => {
  const {
    selectedMonth,
    monthlyIncome,
    monthlyExpense,
    monthlyCardSpend,
    monthlySavings,
    monthlyBalance,
    savingsRate,
    currency,
    filteredTransactions,
    categoryLimits,
    categorySpendingMap,
    familyMembers
  } = useBudget();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Exceeded / warning limits count
  const warnCount = categoryLimits.filter((lim) => {
    const spent = categorySpendingMap[lim.category] || 0;
    const limitConverted = convertCurrency(lim.monthlyLimit, lim.currency, currency);
    return limitConverted > 0 && (spent / limitConverted) * 100 >= lim.alertThresholdPercent;
  }).length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Header */}
      <HeaderBar
        onOpenSync={onOpenSync}
        onOpenNotifications={onOpenNotifications}
        onOpenShare={onOpenShare}
        onOpenReceiptScanner={onOpenReceiptScanner}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Tablet Subheader Bar with Quick Stats & Tab Switcher */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Özet</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>İşlemler</span>
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cards'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-sky-500" />
            <span>Kartlar</span>
          </button>
          <button
            onClick={() => setActiveTab('installments')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'installments'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <span>Borçlar</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Birikim</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReceiptScanner && (
            <button
              onClick={onOpenReceiptScanner}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Fiş Tara</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingTx(null);
              setIsAddTxOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>İşlem Ekle</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {activeTab === 'overview' && (
            <OverviewPanel onEditTx={(tx) => { setEditingTx(tx); setIsAddTxOpen(true); }} onSeeAll={() => setActiveTab('transactions')} />
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="max-w-xs">
                <MonthSwitcher />
              </div>
              <FilterBar />
              <TransactionTable
                transactions={filteredTransactions}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setIsAddTxOpen(true);
                }}
              />
              <ChartsPanel />
            </div>
          )}

          {activeTab === 'installments' && (
            <div className="space-y-6">
              <InstallmentsView section="debts" />
              <InstallmentsView section="recurring" />
            </div>
          )}
        {activeTab === 'cards' && <InstallmentsView section="cards" />}
          {activeTab === 'goals' && <GoalsView />}
        </div>
      </div>

      {/* Modal */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        editTransaction={editingTx}
      />
    </div>
  );
};

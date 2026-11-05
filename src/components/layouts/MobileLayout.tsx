import { txTone } from '../../utils/txStyle';
import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab, Transaction } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { BudgetPlanCard } from '../common/BudgetPlanCard';
import { OverviewPanel } from '../common/OverviewPanel';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { TxHeader } from '../common/TxHeader';
import { ChartsPanel } from '../common/ChartsPanel';
import { MonthSwitcher, monthLabel } from '../common/MonthSwitcher';
import { monthKeyOf } from '../../utils/budgetMonth';
import { SavingsGoalCard } from '../charts/SavingsGoalCard';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { AddGoalModal } from '../modals/AddGoalModal';
import { AssetsSection } from '../views/AssetsSection';
import { InstallmentsView } from '../views/InstallmentsView';
import {
  LayoutGrid,
  Receipt,
  PieChart,
  Target,
  Sliders,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  TrendingUp,
  Smartphone,
  CreditCard,
  Sparkles,
  Mic,
  X,
  Download,
  Wallet
} from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
}

export const MobileLayout: React.FC<Props> = ({
  onOpenSync,
  onOpenNotifications,
  onOpenShare
}) => {
  const {
    selectedMonth,
    currency,
    setCurrency,
    darkMode,
    toggleDarkMode,
    monthlyIncome,
    monthlyExpense,
    monthlyCardSpend,
    monthlySavings,
    monthlyBalance,
    savingsRate,
    filteredTransactions,
    categoryLimits,
    savingsGoals,
    notifications,
    syncConfig,
    categorySpendingMap
  } = useBudget();

  const [activeTab, setActiveTab] = useActiveTab();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [voiceStart, setVoiceStart] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // Check critical limit alerts
  const criticalAlerts = categoryLimits.filter((l) => {
    const spent = categorySpendingMap[l.category] || 0;
    const limitVal = convertCurrency(l.monthlyLimit, l.currency, currency);
    return limitVal > 0 && (spent / limitVal) * 100 >= l.alertThresholdPercent;
  });

  return (
    <div className="min-h-screen pb-24 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <h1 className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Cebim
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Share / Install on Phone */}
          <button
            onClick={onOpenShare}
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50"
            title="Linki Paylaş"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Sync status */}
          <button
            onClick={onOpenSync}
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 relative"
            title="Eşitleme ve Yedek"
          >
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                syncConfig.status === 'error'
                  ? 'bg-rose-500'
                  : syncConfig.status === 'syncing'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-sky-500'
              }`}
            />
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 relative"
            title="Bildirimler"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>
      </header>

      {/* Sekmeler */}
      <div className="sticky top-14 z-20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.id ? 'bg-sky-600 text-white shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {t.short}
          </button>
        ))}
      </div>

      {/* Main Scrollable Content */}
      <main className="flex-1 p-4 pb-28 space-y-4 max-w-lg mx-auto w-full">

        {activeTab === 'overview' && (
          <OverviewPanel onEditTx={(tx) => { setEditingTx(tx); setIsAddTxOpen(true); }} onSeeAll={() => setActiveTab('transactions')} />
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <TxHeader />
            <FilterBar />
            <TransactionTable
              transactions={filteredTransactions}
              onEdit={(tx) => {
                setEditingTx(tx);
                setIsAddTxOpen(true);
              }}
              compact={true}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <TxHeader />
            <ChartsPanel />
          </div>
        )}


        {/* TAB 4: GOALS */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <AssetsSection />

            <div className="flex items-center justify-between pt-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Birikim Hedefleri
              </h3>
              <button
                onClick={() => setIsAddGoalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Hedef Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {savingsGoals.map((goal) => (
                <SavingsGoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </div>
        )}


        {/* TAB: INSTALLMENTS & DEBTS */}
        {activeTab === 'installments' && (
          <div className="space-y-6">
            <InstallmentsView section="debts" />
            <InstallmentsView section="recurring" />
          </div>
        )}
        {activeTab === 'cards' && <InstallmentsView section="cards" />}

        {/* TAB: SIMULATOR */}
      </main>

      {/* Floating Bottom Quick Action Buttons */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-center gap-3">
        <button
          onClick={() => {
            setEditingTx(null);
            setVoiceStart(true);
            setIsAddTxOpen(true);
          }}
          className="w-12 h-12 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          title="Sesle İşlem Ekle"
        >
          <Mic className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            setEditingTx(null);
            setVoiceStart(false);
            setIsAddTxOpen(true);
          }}
          className="w-13 h-13 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          title="Yeni İşlem Ekle"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        editTransaction={editingTx}
        startWithVoice={voiceStart}
      />
      <AddGoalModal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
      />
    </div>
  );
};

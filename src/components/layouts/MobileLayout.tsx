import { txTone } from '../../utils/txStyle';
import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab, Transaction } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { BudgetPlanCard } from '../common/BudgetPlanCard';
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
  onOpenReceiptScanner?: () => void;
}

export const MobileLayout: React.FC<Props> = ({
  onOpenSync,
  onOpenNotifications,
  onOpenShare,
  onOpenReceiptScanner
}) => {
  const {
    selectedMonth,
    currency,
    setCurrency,
    darkMode,
    toggleDarkMode,
    monthlyIncome,
    monthlyExpense,
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-24 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Cebim
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency selector */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            className="text-[11px] font-semibold py-1 px-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          >
            <option value="TRY">₺ TRY</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>

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

      {/* Horizontal Scrollable Quick Category Navigation Strip */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Özet
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'transactions'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          İşlemler
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'cards'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Kartlar</span>
        </button>
        <button
          onClick={() => setActiveTab('installments')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'installments'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          <span>Borçlar</span>
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'goals'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Birikim
        </button>
      </div>

      {/* Main Scrollable Content */}
      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <MonthSwitcher />
            {/* Quick Balance Card */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                Net Aylık Hane Bakiyesi
              </span>
              <div className="flex items-baseline justify-between mb-3">
                <span className={`text-2xl font-bold font-mono tabular-nums ${
                  monthlyBalance >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance, currency)}
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
                  %{savingsRate} Birikim
                </span>
              </div>

              {/* Income / Expense dual row */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Gelir</span>
                    <span className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">
                      +{formatCurrency(monthlyIncome, currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Gider</span>
                    <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(monthlyExpense, currency)}
                    </span>
                  </div>
                </div>
              </div>
              {monthlySavings > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Bu ay birikime ayrılan</span>
                  <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{formatCurrency(monthlySavings, currency)}</span>
                </div>
              )}
            </div>

            {selectedMonth === monthKeyOf(new Date()) && <BudgetPlanCard />}
            {selectedMonth === monthKeyOf(new Date()) && <InstallmentsView section="recurring" />}

            {/* Quick Category Donut Preview */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Harcama Dağılımı ({monthLabel(selectedMonth)})
                </h3>
              </div>
              <CategoryDonutChart compact={true} />
            </div>

            {/* Recent Transactions List (compact mobile tap rows) */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Son Bütçe Hareketleri
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-sky-600 dark:text-sky-400 font-medium"
                >
                  Tümünü Gör ({filteredTransactions.length})
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTransactions.slice(0, 5).map((tx) => {
                  const isInc = tx.type === 'income';
                  const tone = txTone(tx.type);
                  const converted = convertCurrency(tx.amount, tx.currency, currency);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setEditingTx(tx);
                        setIsAddTxOpen(true);
                      }}
                      className="py-2.5 flex items-center justify-between gap-3 active:bg-neutral-50 dark:active:bg-neutral-800 cursor-pointer min-h-[48px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone.badge}`}
                        >
                          {isInc ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {tx.description}
                          </p>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {tx.date} · {tx.category} · {tx.member}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <span
                          className={`text-xs font-bold ${tone.text}`}
                        >
                          {tone.sign}
                          {formatCurrency(converted, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <MonthSwitcher />
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
        {activeTab === 'installments' && <InstallmentsView section="debts" />}
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
          className="w-13 h-13 rounded-full bg-slate-900 dark:bg-sky-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
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

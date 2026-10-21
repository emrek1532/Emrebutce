import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab, Transaction } from '../../types/budget';
import { HeaderBar } from '../common/HeaderBar';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { AnalyticsView } from '../views/AnalyticsView';
import { LimitsView } from '../views/LimitsView';
import { GoalsView } from '../views/GoalsView';
import { InstallmentsView } from '../views/InstallmentsView';
import { SimulatorView } from '../views/SimulatorView';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
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
    monthlyIncome,
    monthlyExpense,
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
            onClick={() => setActiveTab('installments')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'installments'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            <span>Taksitler & Borçlar</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Simülatör</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Analiz</span>
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'limits'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Limitler</span>
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
            <span>Hedefler</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReceiptScanner && (
            <button
              onClick={onOpenReceiptScanner}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Fiş Tara</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingTx(null);
              setIsAddTxOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>İşlem Ekle</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-12 gap-6">
        {/* Left Side Pane (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          {/* Balance card */}
          <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Net Hane Bütçesi
            </span>
            <div className="flex items-baseline justify-between mb-3">
              <span className={`text-2xl font-bold font-mono ${
                monthlyBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance, currency)}
              </span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                %{savingsRate} Tasarruf
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 text-[10px] block">Aylık Gelir</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(monthlyIncome, currency)}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">Aylık Gider</span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                  -{formatCurrency(monthlyExpense, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Limit Alert Warning Card */}
          {warnCount > 0 && (
            <div
              onClick={() => setActiveTab('limits')}
              className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold">Kritik Bütçe Eşikleri</h4>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300">
                {warnCount} kategoride belirlenen harcama tavanına yaklaşıldı veya aşıldı.
              </p>
            </div>
          )}

          {/* Family Members list */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <span>Aile Üyeleri</span>
            </h4>
            <div className="space-y-2">
              {familyMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{m.name}</span>
                  </div>
                  <span className="text-neutral-400">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Detail Workspace (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-4">
                  Kategori Harcama Dağılımı
                </h3>
                <CategoryDonutChart />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Son İşlemler
                  </h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    Tümünü Gör
                  </button>
                </div>
                <TransactionTable
                  transactions={filteredTransactions.slice(0, 6)}
                  onEdit={(tx) => {
                    setEditingTx(tx);
                    setIsAddTxOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <FilterBar />
              <TransactionTable
                transactions={filteredTransactions}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setIsAddTxOpen(true);
                }}
              />
            </div>
          )}

          {activeTab === 'installments' && <InstallmentsView />}
          {activeTab === 'simulator' && <SimulatorView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'limits' && <LimitsView />}
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

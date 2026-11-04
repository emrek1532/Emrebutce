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
import { CashFlowTrendChart } from '../charts/CashFlowTrendChart';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Sliders,
  Camera,
  Sparkles
} from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
  onOpenReceiptScanner?: () => void;
}

export const DesktopLayout: React.FC<Props> = ({
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
    exportCsv,
    exportEncryptedVault
  } = useBudget();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Critical limit warnings
  const criticalLimits = categoryLimits.filter((lim) => {
    const spent = categorySpendingMap[lim.category] || 0;
    const limitConverted = convertCurrency(lim.monthlyLimit, lim.currency, currency);
    return limitConverted > 0 && (spent / limitConverted) * 100 >= lim.alertThresholdPercent;
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar Contract (3 zones) */}
      <HeaderBar
        onOpenSync={onOpenSync}
        onOpenNotifications={onOpenNotifications}
        onOpenShare={onOpenShare}
        onOpenReceiptScanner={onOpenReceiptScanner}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
        {/* Top Headline & Quick Action */}
        <div className="flex items-center justify-end gap-3">
            {onOpenReceiptScanner && (
              <button
                onClick={onOpenReceiptScanner}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Fiş / Fatura Tara (OCR)</span>
              </button>
            )}

            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>CSV İndir</span>
            </button>

            <button
              onClick={() => {
                setEditingTx(null);
                setIsAddTxOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İşlem Ekle</span>
            </button>
        </div>

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
          <div className="space-y-8">
            <InstallmentsView section="debts" />
            <InstallmentsView section="recurring" />
          </div>
        )}
        {activeTab === 'cards' && <InstallmentsView section="cards" />}
        {activeTab === 'goals' && <GoalsView />}
      </main>

      {/* Modal */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        editTransaction={editingTx}
      />
    </div>
  );
};

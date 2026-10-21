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
import { CashFlowTrendChart } from '../charts/CashFlowTrendChart';
import { BudgetProgressCard } from '../charts/BudgetProgressCard';
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
    monthlyIncome,
    monthlyExpense,
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Top Headline & Quick Action */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Aile Finans & Bütçe Yönetimi
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Uçtan uca şifreli bulut kasası · Otomatik senkronizasyon · Bütçe limit uyarıları
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenReceiptScanner && (
              <button
                onClick={onOpenReceiptScanner}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İşlem Ekle</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Strips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Bakiye */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Net Hane Bakiyesi (Bu Ay)
              </span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono tabular-nums ${
                monthlyBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance, currency)}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-1">
              Gelir - Gider net farkı
            </span>
          </div>

          {/* Toplam Gelir */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Toplam Gelir
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(monthlyIncome, currency)}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-1">
              Maaş, prim ve ek gelirler
            </span>
          </div>

          {/* Toplam Harcama */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Toplam Harcama
              </span>
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                -{formatCurrency(monthlyExpense, currency)}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-1">
              Kira, fatura ve günlük harcamalar
            </span>
          </div>

          {/* Tasarruf Oranı */}
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Aylık Tasarruf Oranı
              </span>
              <PiggyBank className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                %{savingsRate}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-1">
              Gelirin birikim payı (Hedef: %25)
            </span>
          </div>
        </div>

        {/* Warning Banner if any category exceeds alertThreshold */}
        {criticalLimits.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {criticalLimits.length} Kategori Bütçe Sınırına Ulaştı veya Aştı
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {criticalLimits.map((c) => c.category).join(', ')} için harcama limitleri kritik seviyede.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('limits')}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Limitleri Yönet
            </button>
          </div>
        )}

        {/* TAB CONTENTS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Visual Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Category Donut */}
              <div className="lg:col-span-5 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Kategori Dağılımı (Bu Ay)
                  </h3>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Detaylı Rapor
                  </button>
                </div>
                <CategoryDonutChart compact={false} />
              </div>

              {/* Cash Flow Trend */}
              <div className="lg:col-span-7 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Nakit Akış Trendi (Son 6 Ay)
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    Gelir vs Gider
                  </span>
                </div>
                <CashFlowTrendChart />
              </div>
            </div>

            {/* Recent Transactions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Son Bütçe Hareketleri
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                >
                  Tüm İşlemleri Gör ({filteredTransactions.length})
                </button>
              </div>

              <TransactionTable
                transactions={filteredTransactions.slice(0, 8)}
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

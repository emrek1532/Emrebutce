import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab, Transaction } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { CategoryDonutChart } from '../charts/CategoryDonutChart';
import { BudgetProgressCard } from '../charts/BudgetProgressCard';
import { SavingsGoalCard } from '../charts/SavingsGoalCard';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { SetLimitModal } from '../modals/SetLimitModal';
import { AddGoalModal } from '../modals/AddGoalModal';
import { InstallmentsView } from '../views/InstallmentsView';
import { SimulatorView } from '../views/SimulatorView';
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
  Camera,
  X,
  Download
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
    currency,
    setCurrency,
    darkMode,
    toggleDarkMode,
    monthlyIncome,
    monthlyExpense,
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
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isSetLimitOpen, setIsSetLimitOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    return !isStandalone;
  });

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
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Ailve
            </h1>
            <span className="text-[10px] text-neutral-400 font-mono">
              📱 Mobil Bütçe
            </span>
          </div>
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
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
            title="Telefona Yükle & QR Paylaş"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Sync status */}
          <button
            onClick={onOpenSync}
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 relative"
            title="Şifreli Bulut Kasası"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
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
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Özet
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'transactions'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          İşlemler
        </button>
        <button
          onClick={() => setActiveTab('installments')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'installments'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Taksitler & Borçlar</span>
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'simulator'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Simülatör</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'analytics'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Analiz
        </button>
        <button
          onClick={() => setActiveTab('limits')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'limits'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Limitler
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'goals'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          Hedefler
        </button>
      </div>

      {/* Main Scrollable Content */}
      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Mobile PWA Install Guidance Banner */}
        {showInstallBanner && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 border-2 border-emerald-400 dark:border-emerald-600 text-xs text-emerald-950 dark:text-emerald-100 flex items-start justify-between gap-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-100">
                  <span>📱 Telefon Ana Ekranına Yükleme İpucu</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-tight">
                  Chrome'da <strong>(⋮) menüsüne</strong> basın. Açılan kutuda <strong>"Bu uygulama yüklenemez"</strong> uyarısının hemen altındaki <strong>"Kısayol oluştur"</strong> butonuna dokunun.
                </p>
                <div className="pt-0.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenShare}
                    className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700 dark:text-emerald-300 underline"
                  >
                    <span>Detaylı Resimli Çözüm</span>
                  </button>
                  <span className="text-neutral-400">·</span>
                  <button
                    type="button"
                    onClick={() => setShowInstallBanner(false)}
                    className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    Anladım, Gizle
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 shrink-0"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Critical Alerts Banner (Mobile Friendly) */}
        {criticalAlerts.length > 0 && (
          <div
            onClick={() => setActiveTab('limits')}
            className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{criticalAlerts.length} Kategori</strong> harcama sınırına yaklaştı veya aştı!
              </span>
            </div>
            <span className="text-[10px] font-bold underline shrink-0">İncele</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Balance Card */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                Net Aylık Hane Bakiyesi
              </span>
              <div className="flex items-baseline justify-between mb-3">
                <span className={`text-2xl font-bold font-mono tabular-nums ${
                  monthlyBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance, currency)}
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  %{savingsRate} Tasarruf
                </span>
              </div>

              {/* Income / Expense dual row */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Gelir</span>
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
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
            </div>

            {/* Quick Category Donut Preview */}
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Harcama Dağılımı (Bu Ay)
                </h3>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  Detaylar
                </button>
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
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  Tümünü Gör ({filteredTransactions.length})
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTransactions.slice(0, 5).map((tx) => {
                  const isInc = tx.type === 'income';
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isInc
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                          }`}
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
                          className={`text-xs font-bold ${
                            isInc
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isInc ? '+' : '-'}
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

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-3">
                Kategori Dağılımı
              </h3>
              <CategoryDonutChart compact={true} />
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-3">
                Nakit Akış Trendi
              </h3>
              <div className="h-60">
                <CategoryDonutChart compact={true} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GOALS */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Tasarruf Hedefleri
              </h3>
              <button
                onClick={() => setIsAddGoalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
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

        {/* TAB 5: LIMITS */}
        {activeTab === 'limits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Bütçe Limitleri
              </h3>
              <button
                onClick={() => setIsSetLimitOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Limit Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {categoryLimits.map((lim) => (
                <BudgetProgressCard
                  key={lim.id}
                  limit={lim}
                  onEdit={() => setIsSetLimitOpen(true)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB: INSTALLMENTS & DEBTS */}
        {activeTab === 'installments' && <InstallmentsView />}

        {/* TAB: SIMULATOR */}
        {activeTab === 'simulator' && <SimulatorView />}
      </main>

      {/* Floating Bottom Quick Action Buttons */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-center gap-2.5">
        {onOpenReceiptScanner && (
          <button
            onClick={onOpenReceiptScanner}
            className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="Fiş / Fatura Tara (OCR)"
          >
            <Camera className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => {
            setEditingTx(null);
            setIsAddTxOpen(true);
          }}
          className="w-13 h-13 rounded-full bg-slate-900 dark:bg-emerald-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          title="Yeni İşlem Ekle"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Ergonomic Bottom Tab Bar (thumb-zone compliant, <= 15% sticky height) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 h-16 px-2 grid grid-cols-5 items-center">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'overview'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] mt-1">Özet</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'transactions'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] mt-1">İşlemler</span>
        </button>

        <button
          onClick={() => setActiveTab('installments')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'installments'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] mt-1">Taksitler</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'simulator'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] mt-1">Simülatör</span>
        </button>

        <button
          onClick={() => setActiveTab('limits')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'limits'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px] mt-1">Limitler</span>
        </button>
      </nav>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        editTransaction={editingTx}
      />
      <SetLimitModal
        isOpen={isSetLimitOpen}
        onClose={() => setIsSetLimitOpen(false)}
      />
      <AddGoalModal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
      />
    </div>
  );
};

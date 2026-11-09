import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { OverviewPanel } from '../common/OverviewPanel';
import { useActiveTab } from '../../utils/activeTab';
import { APP_VERSION } from '../../version';
import { TxHeader } from '../common/TxHeader';
import { ChartsPanel } from '../common/ChartsPanel';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { GoalsView } from '../views/GoalsView';
import { InstallmentsView } from '../views/InstallmentsView';
import { Plus, ShieldCheck, Bell, Sun, Moon, Smartphone, Wallet, Home, ArrowLeftRight, BarChart3, CreditCard, Landmark, PiggyBank, LayoutGrid, X, ChevronRight } from 'lucide-react';
import { ActiveTab } from '../../types/budget';

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
  const { darkMode, toggleDarkMode, filteredTransactions, notifications, syncConfig } = useBudget();

  const [activeTab, setActiveTab] = useActiveTab();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [moreOpen, setMoreOpen] = useState(false);
  const go = (t: ActiveTab) => {
    setActiveTab(t);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };
  // Alt menü: sık kullanılan sekmeler; Birikim ve ayarlar "Diğer"de
  const NAV: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Özet', icon: Home },
    { id: 'transactions', label: 'İşlemler', icon: ArrowLeftRight },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    { id: 'cards', label: 'Kartlar', icon: CreditCard },
    { id: 'installments', label: 'Borçlar', icon: Landmark }
  ];
  const inMore = !NAV.some((n) => n.id === activeTab);
  const syncText = syncConfig.status === 'error' ? 'Eşitlenemedi' : syncConfig.status === 'syncing' ? 'Eşitleniyor…' : 'Eşitlendi';
  const moreItem = 'w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800';

  return (
    <div className="min-h-screen text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Üst çubuk: logo, sürüm, bildirim */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 h-14 flex items-center justify-between">
        <button type="button" className="flex items-center gap-2" onClick={() => go('overview')}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">Cebim</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500" title="Uygulama sürümü">
            v{APP_VERSION}
          </span>
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
            title="Bildirimler"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 p-4 pb-36 space-y-4 max-w-lg mx-auto w-full">

        {activeTab === 'overview' && (
          <OverviewPanel onEditTx={(tx) => { setEditingTx(tx); setIsAddTxOpen(true); }} />
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
        {activeTab === 'goals' && <GoalsView />}

        {/* TAB: INSTALLMENTS & DEBTS */}
        {activeTab === 'installments' && (
          <div className="space-y-6">
            <InstallmentsView section="debts" />
            <InstallmentsView section="recurring" />
          </div>
        )}
        {activeTab === 'cards' && <InstallmentsView section="cards" />}

      </main>

      {/* Yeni işlem (sesle ekleme pencerenin içindeki mikrofon düğmesinde); Diğer menüsü açıkken gizli */}
      {!moreOpen && (
      <button
        onClick={() => {
          setEditingTx(null);
          setIsAddTxOpen(true);
        }}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-2xl shadow-sky-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Yeni İşlem Ekle"
      >
        <Plus className="w-6 h-6" />
      </button>
      )}

      {/* Alt menü */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto grid grid-cols-6">
          {[...NAV, { id: 'more' as const, label: 'Diğer', icon: LayoutGrid }].map((n) => {
            const active = n.id === 'more' ? inMore || moreOpen : activeTab === n.id && !moreOpen;
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => (n.id === 'more' ? setMoreOpen(!moreOpen) : go(n.id))}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-semibold ${
                  active ? 'text-sky-600 dark:text-sky-400' : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <span className={`px-3 py-1 rounded-full ${active ? 'bg-sky-100 dark:bg-sky-950/60' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Diğer menüsü */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-t-3xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Diğer</span>
              <button type="button" onClick={() => setMoreOpen(false)} className="p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800" title="Kapat">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <button type="button" className={moreItem} onClick={() => go('goals')}>
                <PiggyBank className="w-5 h-5 text-amber-500" /> <span className="flex-1 text-left">Birikim & Hedefler</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
              <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onOpenShare(); }}>
                <Smartphone className="w-5 h-5 text-sky-600" /> <span className="flex-1 text-left">Linki Paylaş / telefona bağla</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
              <button type="button" className={moreItem} onClick={() => { setMoreOpen(false); onOpenSync(); }}>
                <ShieldCheck className={`w-5 h-5 ${syncConfig.status === 'error' ? 'text-rose-500' : 'text-sky-600'}`} />
                <span className="flex-1 text-left">Eşitleme & Yedek</span>
                <span className={`text-xs font-medium ${syncConfig.status === 'error' ? 'text-rose-500' : 'text-neutral-400'}`}>{syncText}</span>
              </button>
              <button type="button" className={moreItem} onClick={toggleDarkMode}>
                {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                <span className="flex-1 text-left">{darkMode ? 'Aydınlık mod' : 'Karanlık mod'}</span>
                <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-sky-600' : 'bg-neutral-300'}`}>
                  <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : ''}`} />
                </span>
              </button>
            </div>
            <p className="py-3 text-center text-[11px] text-neutral-400">Cebim v{APP_VERSION}</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTransactionModal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} editTransaction={editingTx} />
    </div>
  );
};

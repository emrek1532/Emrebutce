import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { OverviewPanel } from '../common/OverviewPanel';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { TxHeader } from '../common/TxHeader';
import { ChartsPanel } from '../common/ChartsPanel';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { GoalsView } from '../views/GoalsView';
import { InstallmentsView } from '../views/InstallmentsView';
import { Plus, ShieldCheck, Bell, Sun, Moon, Smartphone, Wallet } from 'lucide-react';

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
            title={darkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
            className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>
      </header>

      {/* Sekmeler */}
      <div className="sticky top-14 z-20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0 pr-10 [mask-image:linear-gradient(to_right,black_85%,transparent)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              if (el && activeTab === t.id) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
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

        {/* TAB: SIMULATOR */}
      </main>

      {/* Yeni işlem (sesle ekleme pencerenin içindeki mikrofon düğmesinde) */}
      <button
        onClick={() => {
          setEditingTx(null);
          setIsAddTxOpen(true);
        }}
        className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-2xl shadow-sky-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Yeni İşlem Ekle"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modals */}
      <AddTransactionModal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} editTransaction={editingTx} />
    </div>
  );
};

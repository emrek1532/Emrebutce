import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { HeaderBar } from '../common/HeaderBar';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { GoalsView } from '../views/GoalsView';
import { InstallmentsView } from '../views/InstallmentsView';
import { OverviewPanel } from '../common/OverviewPanel';
import { TxHeader } from '../common/TxHeader';
import { ChartsPanel } from '../common/ChartsPanel';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { Plus, FileSpreadsheet } from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
}

const TITLES: Record<string, string> = {
  cards: 'Kredi Kartları',
  goals: 'Birikim & Hedefler'
};

// Tablet ve bilgisayar düzeni (telefonda MobileLayout)
export const DesktopLayout: React.FC<Props> = ({ onOpenSync, onOpenNotifications, onOpenShare }) => {
  const { filteredTransactions, exportCsv } = useBudget();
  const [activeTab, setActiveTab] = useActiveTab();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const edit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsAddTxOpen(true);
  };

  return (
    <div className="min-h-screen text-neutral-900 dark:text-neutral-100 flex flex-col">
      <HeaderBar onOpenSync={onOpenSync} onOpenNotifications={onOpenNotifications} onOpenShare={onOpenShare} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              {TITLES[activeTab] ?? TABS.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>CSV İndir</span>
            </button>
            <button
              onClick={() => {
                setEditingTx(null);
                setIsAddTxOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İşlem Ekle</span>
            </button>
          </div>
        </div>

        {activeTab === 'overview' && <OverviewPanel onEditTx={edit} onSeeAll={() => setActiveTab('transactions')} />}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <TxHeader />
            <FilterBar />
            <TransactionTable transactions={filteredTransactions} onEdit={edit} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <TxHeader />
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

      <AddTransactionModal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} editTransaction={editingTx} />
    </div>
  );
};

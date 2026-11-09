import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { FilterBar } from '../common/FilterBar';
import { TransactionTable } from '../common/TransactionTable';
import { GoalsView } from '../views/GoalsView';
import { GuideView } from '../views/GuideView';
import { InstallmentsView } from '../views/InstallmentsView';
import { OverviewPanel } from '../common/OverviewPanel';
import { TxHeader } from '../common/TxHeader';
import { ChartsPanel } from '../common/ChartsPanel';
import { AskBox } from '../common/AskBox';
import { StatCards } from '../home/StatCards';
import { MonthSelect } from '../home/MonthSelect';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { Sidebar } from './Sidebar';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { Bell, Download, Moon, Plus, Sparkles, Sun } from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
}

const TITLES: Record<string, [string, string]> = {
  transactions: ['Harcama & Gelirler', 'Tüm işlemler, filtreler ve arama'],
  reports: ['Raporlar', 'Kategoriler, kişiler, sınırlar ve aylık gidişat'],
  cards: ['Kredi Kartları', 'Ekstre borcu, asgari ödeme ve kalan limit'],
  installments: ['Borçlar', 'Taksitler, krediler ve düzenli ödemeler'],
  goals: ['Birikim & Hedefler', 'Altın, döviz, TL birikimi ve hedefler'],
  guide: ['Kullanım Kılavuzu', 'Neyi nereye girmeli, rakamlar nasıl hesaplanır']
};

// Tablet ve bilgisayar düzeni: solda menü, üstte selamlama ve araçlar (telefonda MobileLayout)
export const DesktopLayout: React.FC<Props> = ({ onOpenSync, onOpenNotifications, onOpenShare }) => {
  const { filteredTransactions, exportCsv, familyMembers, notifications, darkMode, toggleDarkMode } = useBudget();
  const [activeTab] = useActiveTab();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const edit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsAddTxOpen(true);
  };
  const name = familyMembers.find((m) => m.name !== 'Ortak')?.name ?? '';
  const [title, subtitle] =
    activeTab === 'overview'
      ? [`Merhaba${name ? ` ${name}` : ''} 👋`, 'Finansal durumunu birlikte inceleyelim.']
      : TITLES[activeTab] ?? [TABS.find((t) => t.id === activeTab)?.label ?? '', ''];
  const showMonth = activeTab === 'overview' || activeTab === 'transactions' || activeTab === 'reports';
  const iconBtn =
    'relative w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shadow-xs transition-colors';

  return (
    <div className="min-h-screen text-neutral-900 dark:text-neutral-100 flex">
      <Sidebar onOpenSync={onOpenSync} onOpenShare={onOpenShare} />

      <div className="flex-1 min-w-0">
        <header className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {activeTab === 'overview' && (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 to-indigo-200 dark:from-sky-900 dark:to-indigo-900 text-sky-700 dark:text-sky-200 flex items-center justify-center text-lg font-extrabold shrink-0">
                {(name || 'C').charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">{title}</h1>
              {subtitle && <p className="text-sm text-neutral-500 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAskOpen(!askOpen)}
                className="flex items-center gap-2 h-10 px-3 lg:px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-500 shadow-xs hover:border-sky-300"
                title="Bütçene sor"
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span className="hidden xl:inline pr-6">Bütçene sor…</span>
              </button>
              {askOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAskOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-[min(28rem,calc(100vw-7rem))] shadow-xl rounded-2xl">
                    <AskBox />
                  </div>
                </>
              )}
            </div>
            {showMonth && <MonthSelect className="h-10" />}
            <button type="button" onClick={exportCsv} className={`${iconBtn} xl:w-auto xl:px-4 xl:gap-2`} title="CSV İndir">
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline text-sm font-semibold">CSV İndir</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setIsAddTxOpen(true);
              }}
              className="h-10 flex items-center gap-2 px-4 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Yeni İşlem</span>
            </button>
            <button type="button" onClick={onOpenNotifications} title="Bildirimler" className={iconBtn}>
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            <button type="button" onClick={toggleDarkMode} title={darkMode ? 'Aydınlık Mod' : 'Karanlık Mod'} className={iconBtn}>
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
          {activeTab === 'overview' && <OverviewPanel onEditTx={edit} />}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <TxHeader cards />
              <FilterBar />
              <TransactionTable transactions={filteredTransactions} onEdit={edit} />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-5">
              <StatCards />
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
          {activeTab === 'guide' && <GuideView />}
        </main>
      </div>

      <AddTransactionModal isOpen={isAddTxOpen} onClose={() => setIsAddTxOpen(false)} editTransaction={editingTx} />
    </div>
  );
};

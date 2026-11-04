import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Currency, DeviceMode } from '../../types/budget';
import { CURRENCY_CONFIG } from '../../utils/currencies';
import {
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  Smartphone,
  Sparkles,
  Cloud,
  CheckCircle2,
  Wallet
} from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
  onOpenReceiptScanner?: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const HeaderBar: React.FC<Props> = ({
  onOpenSync,
  onOpenNotifications,
  onOpenShare,
  onOpenReceiptScanner,
  activeTab,
  setActiveTab
}) => {
  const {
    currency,
    setCurrency,
    darkMode,
    toggleDarkMode,
    syncConfig,
    notifications
  } = useBudget();

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
              Cebim
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop/Tablet) */}
        <nav className="hidden lg:flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] items-center gap-3 xl:gap-5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'overview'
                ? 'text-sky-600 dark:text-sky-400 font-bold border-b-2 border-sky-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'transactions'
                ? 'text-sky-600 dark:text-sky-400 font-bold border-b-2 border-sky-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Harcama & Gelirler
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1 ${
              activeTab === 'cards'
                ? 'text-sky-600 dark:text-sky-400 font-bold border-b-2 border-sky-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span>Kartlar</span>
          </button>
          <button
            onClick={() => setActiveTab('installments')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1 ${
              activeTab === 'installments'
                ? 'text-sky-600 dark:text-sky-400 font-bold border-b-2 border-sky-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span>Borçlar</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'goals'
                ? 'text-sky-600 dark:text-sky-400 font-bold border-b-2 border-sky-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Birikim
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Receipt OCR Scan */}
          {onOpenReceiptScanner && (
            <button
              onClick={onOpenReceiptScanner}
              title="Fiş / Fatura Tara & Otomatik Ekle"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Fiş Tara</span>
            </button>
          )}

          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
            title="Para Birimi Değiştir"
          >
            {Object.keys(CURRENCY_CONFIG).map((cur) => (
              <option key={cur} value={cur}>
                {CURRENCY_CONFIG[cur as Currency].symbol} {cur}
              </option>
            ))}
          </select>

          {/* Share & Install on Phone */}
          <button
            onClick={onOpenShare}
            title="Linki Paylaş"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Linki Paylaş</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={onOpenSync}
            title="Eşitleme ve Yedek"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                syncConfig.status === 'error'
                  ? 'text-rose-500'
                  : syncConfig.status === 'syncing'
                  ? 'text-amber-500 animate-pulse'
                  : 'text-sky-600 dark:text-sky-400'
              }`}
            />
            <span className="hidden md:inline text-[11px]">
              {syncConfig.status === 'error' ? 'Eşitlenemedi' : syncConfig.status === 'syncing' ? 'Eşitleniyor' : 'Eşitlendi'}
            </span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            title="Bütçe Bildirimleri"
            className="relative p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};

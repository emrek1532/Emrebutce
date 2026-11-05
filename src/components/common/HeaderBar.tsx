import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { ShieldCheck, Bell, Sun, Moon, Smartphone, Wallet } from 'lucide-react';

interface Props {
  onOpenSync: () => void;
  onOpenNotifications: () => void;
  onOpenShare: () => void;
}

// Tablet ve bilgisayar üst çubuğu: logo, sekmeler (geniş ekranda), paylaş/eşitleme/bildirim/tema
export const HeaderBar: React.FC<Props> = ({ onOpenSync, onOpenNotifications, onOpenShare }) => {
  const { darkMode, toggleDarkMode, syncConfig, notifications } = useBudget();
  const [activeTab, setActiveTab] = useActiveTab();
  const unreadCount = notifications.length;
  const iconBtn =
    'relative p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/70 dark:border-neutral-800">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button type="button" className="flex items-center gap-3 shrink-0" onClick={() => setActiveTab('overview')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">Cebim</span>
        </button>

        <nav className="hidden lg:flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] items-center gap-1 text-[13px] font-semibold text-neutral-600 dark:text-neutral-300">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`whitespace-nowrap transition-colors px-3.5 py-2 rounded-full ${
                activeTab === t.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenShare}
            title="Linki Paylaş"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Linki Paylaş</span>
          </button>

          <button
            onClick={onOpenSync}
            title="Eşitleme ve Yedek"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                syncConfig.status === 'error' ? 'text-rose-500' : syncConfig.status === 'syncing' ? 'text-amber-500 animate-pulse' : 'text-sky-600 dark:text-sky-400'
              }`}
            />
            <span className="hidden md:inline text-[11px]">
              {syncConfig.status === 'error' ? 'Eşitlenemedi' : syncConfig.status === 'syncing' ? 'Eşitleniyor' : 'Eşitlendi'}
            </span>
          </button>

          <button onClick={onOpenNotifications} title="Bildirimler" className={iconBtn}>
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button onClick={toggleDarkMode} title={darkMode ? 'Aydınlık Mod' : 'Karanlık Mod'} className={iconBtn}>
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>
      </div>

      {/* Tablet: sekmeler ikinci satırda */}
      <nav className="lg:hidden flex gap-1 overflow-x-auto [scrollbar-width:none] px-4 sm:px-6 pb-2 text-[13px] font-semibold text-neutral-600 dark:text-neutral-300">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-colors ${
              activeTab === t.id ? 'bg-sky-600 text-white shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
};

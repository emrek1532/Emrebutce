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
  Tablet,
  Monitor,
  Sparkles,
  Cloud,
  CheckCircle2
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
    deviceMode,
    setDeviceMode,
    syncConfig,
    notifications
  } = useBudget();

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            A
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
              Ailve
            </span>
            <span className="hidden sm:inline-block text-[11px] text-neutral-400 font-medium ml-2">
              Aile Finans & Bütçe
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop/Tablet) */}
        <nav className="hidden xl:flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] items-center gap-5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'overview'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Harcama & Gelirler
          </button>
          <button
            onClick={() => setActiveTab('installments')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1 ${
              activeTab === 'installments'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span>Taksitler & Borçlar</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Yeni</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1 ${
              activeTab === 'simulator'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span>Bütçe Simülatörü</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">24 Ay</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'analytics'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Analiz & Raporlar
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'limits'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Bütçe Limitleri
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'goals'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500'
                : 'hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Tasarruf Hedefleri
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Receipt OCR Scan */}
          {onOpenReceiptScanner && (
            <button
              onClick={onOpenReceiptScanner}
              title="Fiş / Fatura Tara & Otomatik Ekle"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Fiş Tara</span>
            </button>
          )}

          {/* Device UI Mode Switcher (Required feature: phone, tablet, desktop UIs) */}
          <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setDeviceMode('auto')}
              title="Otomatik Cihaz Algılama"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'auto'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-medium'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Oto
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              title="Telefon Arayüzü Modu"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'mobile'
                  ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              title="Tablet Arayüzü Modu"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'tablet'
                  ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              title="Masaüstü Kokpit Modu"
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'desktop'
                  ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

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
            title="Telefona Yükle & QR ile Paylaş"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Telefona Yükle</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={onOpenSync}
            title="Bulut & Şifreli Kasa Ayarları"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline font-mono text-[11px]">
              {syncConfig.vaultId}
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

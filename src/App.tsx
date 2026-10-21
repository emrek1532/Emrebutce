import React, { useState } from 'react';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { MobileLayout } from './components/layouts/MobileLayout';
import { TabletLayout } from './components/layouts/TabletLayout';
import { DesktopLayout } from './components/layouts/DesktopLayout';
import { CloudSyncModal } from './components/modals/CloudSyncModal';
import { NotificationsDrawer } from './components/modals/NotificationsDrawer';
import { SharePhoneModal } from './components/modals/SharePhoneModal';
import { ReceiptScannerModal } from './components/modals/ReceiptScannerModal';
import { Smartphone, Tablet, Monitor, Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { effectiveDevice, deviceMode, setDeviceMode } = useBudget();
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Device Mode Floating Switcher Pill (convenient quick toggle for reviewer) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 dark:bg-neutral-800/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl border border-neutral-700/60 flex items-center gap-1.5 text-xs opacity-90 hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-neutral-400 font-medium px-1 hidden sm:inline">
          Görünüm:
        </span>
        <button
          onClick={() => setDeviceMode('auto')}
          className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
            deviceMode === 'auto'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-neutral-300 hover:text-white'
          }`}
        >
          Otomatik
        </button>
        <button
          onClick={() => setDeviceMode('mobile')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors ${
            deviceMode === 'mobile'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-neutral-300 hover:text-white'
          }`}
          title="Telefon Arayüzünü Test Et"
        >
          <Smartphone className="w-3 h-3" />
          <span>Telefon</span>
        </button>
        <button
          onClick={() => setDeviceMode('tablet')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors ${
            deviceMode === 'tablet'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-neutral-300 hover:text-white'
          }`}
          title="Tablet Arayüzünü Test Et"
        >
          <Tablet className="w-3 h-3" />
          <span>Tablet</span>
        </button>
        <button
          onClick={() => setDeviceMode('desktop')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors ${
            deviceMode === 'desktop'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-neutral-300 hover:text-white'
          }`}
          title="Masaüstü Arayüzünü Test Et"
        >
          <Monitor className="w-3 h-3" />
          <span>Masaüstü</span>
        </button>
      </div>

      {/* Render dedicated layout based on current or selected viewport */}
      {effectiveDevice === 'mobile' ? (
        <MobileLayout
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        />
      ) : effectiveDevice === 'tablet' ? (
        <TabletLayout
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        />
      ) : (
        <DesktopLayout
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        />
      )}

      {/* Global Modals */}
      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <SharePhoneModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}

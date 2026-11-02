import React, { useEffect, useState } from 'react';
import { buildReminders, pushEnabled, syncRemindersIfChanged } from './utils/paymentReminders';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { MobileLayout } from './components/layouts/MobileLayout';
import { TabletLayout } from './components/layouts/TabletLayout';
import { DesktopLayout } from './components/layouts/DesktopLayout';
import { CloudSyncModal } from './components/modals/CloudSyncModal';
import { NotificationsDrawer } from './components/modals/NotificationsDrawer';
import { SharePhoneModal } from './components/modals/SharePhoneModal';
import { VaultSetupModal } from './components/modals/VaultSetupModal';

// Telefon bildirimi açıksa ödeme listesi değiştikçe sunucudaki kopyayı günceller (değişmediyse istek atmaz)
const useReminderSync = () => {
  const { creditCards, installments, recurring, transactions, syncConfig } = useBudget();
  useEffect(() => {
    if (!pushEnabled()) return;
    const timer = setTimeout(() => {
      syncRemindersIfChanged(syncConfig.vaultId, buildReminders({ creditCards, installments, recurring, transactions })).catch((err) =>
        console.warn('Hatırlatmalar güncellenemedi:', err)
      );
    }, 4000);
    return () => clearTimeout(timer);
  }, [creditCards, installments, recurring, transactions, syncConfig.vaultId]);
};

const AppContent: React.FC = () => {
  const { effectiveDevice } = useBudget();
  useReminderSync();
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Render dedicated layout based on current or selected viewport */}
      {effectiveDevice === 'mobile' ? (
        <MobileLayout
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
        />
      ) : effectiveDevice === 'tablet' ? (
        <TabletLayout
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
        />
      ) : (
        <DesktopLayout
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
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

      <VaultSetupModal />

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

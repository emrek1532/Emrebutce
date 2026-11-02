import React, { useState } from 'react';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { MobileLayout } from './components/layouts/MobileLayout';
import { TabletLayout } from './components/layouts/TabletLayout';
import { DesktopLayout } from './components/layouts/DesktopLayout';
import { CloudSyncModal } from './components/modals/CloudSyncModal';
import { NotificationsDrawer } from './components/modals/NotificationsDrawer';
import { SharePhoneModal } from './components/modals/SharePhoneModal';

const AppContent: React.FC = () => {
  const { effectiveDevice } = useBudget();
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

import React, { useEffect, useState } from 'react';
import { buildReminders, pushEnabled, syncRemindersIfChanged } from './utils/paymentReminders';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { MobileLayout } from './components/layouts/MobileLayout';
import { DesktopLayout } from './components/layouts/DesktopLayout';
import { CloudSyncModal } from './components/modals/CloudSyncModal';
import { NotificationsDrawer } from './components/modals/NotificationsDrawer';
import { SharePhoneModal } from './components/modals/SharePhoneModal';
import { VaultSetupModal } from './components/modals/VaultSetupModal';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { parseBankSms } from './utils/smsParser';

// Telefonda bir SMS "Paylaş → Cebim" ile gönderilince adres /?text=... olarak açılır
const readSharedText = () => {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const text = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join(' ').trim();
  if (!text) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  return text;
};
// Sayfa açılışında bir kez okunur
const SHARED_TEXT = readSharedText();

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
  const { creditCards } = useBudget();
  const shared = SHARED_TEXT;
  const [sharedOpen, setSharedOpen] = useState(!!shared);
  const [sharedDraft] = useState(() => {
    if (!shared) return null;
    const d = parseBankSms(shared, creditCards);
    return {
      type: d.type,
      amount: d.amount ?? undefined,
      description: d.description,
      date: d.date,
      paymentMethod: d.type === 'expense' ? (d.isCard ? ('Kredi Kartı' as const) : ('Havale/EFT' as const)) : undefined,
      cardId: d.cardId
    };
  });

  return (
    <div className="relative min-h-screen">
      {/* Render dedicated layout based on current or selected viewport */}
      {effectiveDevice === 'mobile' ? (
        <MobileLayout
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

      <AddTransactionModal isOpen={sharedOpen} onClose={() => setSharedOpen(false)} prefill={sharedDraft} />

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

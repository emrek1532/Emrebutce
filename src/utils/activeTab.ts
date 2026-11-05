// Açık sekme ekran düzeninden bağımsız tutulur: cihaz çevrilip düzen (telefon/tablet) değişince sekme korunur
import { useSyncExternalStore } from 'react';
import type { ActiveTab } from '../types/budget';

let current: ActiveTab = 'overview';
const listeners = new Set<() => void>();

export const TABS: { id: ActiveTab; label: string; short: string }[] = [
  { id: 'overview', label: 'Genel Bakış', short: 'Özet' },
  { id: 'transactions', label: 'Harcama & Gelirler', short: 'İşlemler' },
  { id: 'reports', label: 'Raporlar', short: 'Raporlar' },
  { id: 'cards', label: 'Kartlar', short: 'Kartlar' },
  { id: 'installments', label: 'Borçlar', short: 'Borçlar' },
  { id: 'goals', label: 'Birikim', short: 'Birikim' }
];

export function setActiveTab(tab: ActiveTab) {
  if (tab === current) return;
  current = tab;
  window.scrollTo?.({ top: 0 });
  listeners.forEach((l) => l());
}

export function useActiveTab(): [ActiveTab, (t: ActiveTab) => void] {
  const tab = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
  return [tab, setActiveTab];
}

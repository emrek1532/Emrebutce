// Yeni sürüm kontrolü: yayındaki /version.json uygulamadaki sürümden farklıysa "Güncelle" gösterilir.
// Telefona yüklü uygulama (PWA) eski dosyaları önbellekte tutabildiği için güncelleme elle de tetiklenebilir.
import { useEffect, useState } from 'react';
import { APP_VERSION } from '../version';

export async function fetchLiveVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

// Önbellekleri temizleyip service worker'ı yeniler ve sayfayı baştan yükler (veriler cihazda/bulutta kalır)
export async function applyUpdate() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
    }
  } finally {
    window.location.reload();
  }
}

export function useUpdateAvailable(): string | null {
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    if (APP_VERSION === 'dev') return;
    let alive = true;
    const check = async () => {
      const v = await fetchLiveVersion();
      if (alive && v && v !== APP_VERSION) setLive(v);
    };
    check();
    const timer = setInterval(check, 10 * 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return live;
}

import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { listVaultBackups, VaultBackupInfo } from '../../utils/cloudStore';
import { History } from 'lucide-react';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Sunucunun her gece aldığı şifreli yedekler (son 7 gün + her ayın 1'i) ve geri yükleme
export const AutoBackups: React.FC = () => {
  const { syncConfig, restoreBackup } = useBudget();
  const [list, setList] = useState<VaultBackupInfo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setBusy('list');
    setMessage(null);
    try {
      setList(await listVaultBackups(syncConfig.vaultId));
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(null);
    }
  };

  const restore = async (b: VaultBackupInfo) => {
    if (
      !window.confirm(
        `${fmt(b.vault_updated_at)} tarihli yedek geri yüklenecek. Bu tarihten sonra girilen kayıtlar tüm cihazlardan silinir. Devam edilsin mi?`
      )
    )
      return;
    setBusy(b.slot);
    setMessage(null);
    try {
      await restoreBackup(b.slot);
      setMessage('Yedek geri yüklendi; diğer cihazlara da gönderiliyor.');
    } catch (e: any) {
      setMessage(e.message || 'Yedek geri yüklenemedi.');
    } finally {
      setBusy(null);
    }
  };

  if (!syncConfig.vaultId) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" /> Otomatik Yedekler
      </h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Verileriniz her gece şifreli olarak yedeklenir: son 7 gün ve her ayın 1'i (12 ay). Yanlışlıkla silinen bir şeyi buradan geri getirebilirsiniz.
      </p>
      {list === null ? (
        <button
          type="button"
          onClick={load}
          disabled={busy !== null}
          className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy === 'list' ? 'Yükleniyor…' : 'Yedekleri göster'}
        </button>
      ) : list.length === 0 ? (
        <p className="text-xs text-neutral-500">Henüz yedek yok; ilk yedek bu gece alınır.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          {list.map((b) => (
            <li key={b.slot} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{fmt(b.vault_updated_at)}</span>
                <span className="text-neutral-400"> · {b.slot.startsWith('M') ? 'aylık' : 'günlük'}</span>
              </span>
              <button
                type="button"
                onClick={() => restore(b)}
                disabled={busy !== null}
                className="px-2 py-1 rounded-md border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 disabled:opacity-50"
              >
                {busy === b.slot ? 'Yükleniyor…' : 'Geri yükle'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="text-xs text-sky-700 dark:text-sky-300">{message}</p>}
    </div>
  );
};

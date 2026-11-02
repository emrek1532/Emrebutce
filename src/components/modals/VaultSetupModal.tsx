import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Link2, Plus, QrCode, Wallet } from 'lucide-react';

// Bu cihaz henüz bir kasaya bağlı değilken açılır: mevcut kasaya bağlan ya da yeni kasa aç.
export const VaultSetupModal: React.FC = () => {
  const { syncConfig, syncFromCloud, createNewVault } = useBudget();
  const [dismissed, setDismissed] = useState(false);
  const [vaultId, setVaultId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

  // QR bağlantısıyla (?vault=...&key=...) açıldıysa bağlantı kendiliğinden kurulur; ekranı gösterme
  const openedWithLink = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('vault');
  if (syncConfig.vaultId || dismissed || openedWithLink) return null;

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultId.trim() || !passphrase.trim()) {
      setError('Kasa kodunu ve anahtarı girin.');
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await syncFromCloud(vaultId.trim().toUpperCase(), passphrase.trim());
    setBusy(false);
    if (!ok) setError('Bağlanılamadı. Kasa kodunu ve anahtarı kontrol edin.');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 my-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Cebim'e hoş geldiniz</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Bu cihaz henüz bir kasaya bağlı değil.</p>
          </div>
        </div>

        <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-300">
            <QrCode className="w-4 h-4" /> En kolayı: QR ile bağlan
          </div>
          <p className="text-xs text-sky-900/80 dark:text-sky-200/80 leading-relaxed">
            Cebim'in açık olduğu diğer cihazda <b>Telefona Yükle</b>'ye basın ve çıkan QR kodu bu cihazın kamerasıyla okutun.
            Veriler kendiliğinden gelir.
          </p>
        </div>

        <form onSubmit={link} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <Link2 className="w-4 h-4" /> Ya da kodla bağlan
          </div>
          <input
            value={vaultId}
            onChange={(e) => setVaultId(e.target.value)}
            placeholder="Kasa kodu (AILE-...)"
            autoCapitalize="characters"
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono"
          />
          <input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Şifreleme anahtarı"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono"
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy ? 'Bağlanıyor…' : 'Mevcut kasaya bağlan'}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          {confirmNew ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Yeni kasa, diğer cihazlarınızdaki verilerle bağlantısız, ayrı bir kasa olur. Emin misiniz?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={createNewVault}
                  className="flex-1 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold"
                >
                  Evet, yeni kasa aç
                </button>
                <button
                  onClick={() => setConfirmNew(false)}
                  className="flex-1 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmNew(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-300"
            >
              <Plus className="w-4 h-4" /> İlk cihazım, yeni kasa aç
            </button>
          )}
          <button onClick={() => setDismissed(true)} className="w-full text-xs text-neutral-400 py-1">
            Şimdilik geç
          </button>
        </div>
      </div>
    </div>
  );
};

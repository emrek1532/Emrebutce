import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Link2, Plus, Wallet } from 'lucide-react';
import { parseShareLink, readShareLinkFromLocation } from '../../utils/shareLink';

// Bu cihaz henüz aile verilerine bağlı değilken açılır: paylaşılan linki aç ya da ilk kez başlat.
export const VaultSetupModal: React.FC = () => {
  const { syncConfig, syncFromCloud, createNewVault } = useBudget();
  const [dismissed, setDismissed] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  // Uygulama paylaşım linkiyle açıldıysa bağlantı kendiliğinden kurulur; o sırada ekranı gösterme
  const [openedWithLink] = useState(() => readShareLinkFromLocation() !== null);

  if (syncConfig.vaultId || dismissed) return null;
  if (openedWithLink && syncConfig.status !== 'error') return null;

  const open = async (e: React.FormEvent) => {
    e.preventDefault();
    const creds = parseShareLink(link);
    if (!creds) {
      setError('Bu bir Cebim paylaşım linki değil.');
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await syncFromCloud(creds.vaultId, creds.passphrase);
    setBusy(false);
    if (!ok) setError('Link açılamadı. Linkin güncel olduğundan emin olun.');
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
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Aile verilerini görmek için size gönderilen linki açın.</p>
          </div>
        </div>

        {openedWithLink && syncConfig.errorMessage && (
          <p className="text-xs text-rose-600">Link açılamadı: {syncConfig.errorMessage}</p>
        )}

        <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 p-4 text-xs text-sky-900/80 dark:text-sky-200/80 leading-relaxed">
          Cebim'i kullanan biri <b>Linki Paylaş</b> düğmesiyle size link gönderir ya da QR kodu gösterir. O linki açmanız yeterli; aynı
          verileri görür, değişiklikleri anında paylaşırsınız.
        </div>

        <form onSubmit={open} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <Link2 className="w-4 h-4" /> Linki buraya yapıştırın
          </div>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy ? 'Açılıyor…' : 'Linki aç'}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          {confirmNew ? (
            <div className="space-y-2">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Sıfırdan yeni bir aile bütçesi başlatılacak; başkalarının verileriyle bağlantısı olmaz. Emin misiniz?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={createNewVault}
                  className="flex-1 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold"
                >
                  Evet, yeni başlat
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
              <Plus className="w-4 h-4" /> Linkim yok, sıfırdan başlat
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

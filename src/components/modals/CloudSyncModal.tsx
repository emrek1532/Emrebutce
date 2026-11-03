import React, { useState, useRef } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { parseShareLink } from '../../utils/shareLink';
import { ExcelImportBar } from '../common/ExcelImportBar';
import { AutoBackups } from '../common/AutoBackups';
import {
  X,
  ShieldCheck,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  Key,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    syncConfig,
    syncToCloud,
    syncFromCloud,
    exportEncryptedVault,
    exportCsv,
    importVaultBackup,
    resetAllData,
    rotatePassphrase
  } = useBudget();
  const [rotating, setRotating] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);


  if (!isOpen) return null;

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const ok = await syncToCloud();
    setIsSyncing(false);
    if (ok) {
      setSyncFeedback('Tüm verileriniz başarıyla şifrelendi ve buluta yedeklendi.');
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const creds = parseShareLink(linkInput);
    if (!creds) {
      setLinkError('Bu bir Cebim paylaşım linki değil.');
      return;
    }
    setLinkError(null);
    setIsSyncing(true);
    const ok = await syncFromCloud(creds.vaultId, creds.passphrase);
    setIsSyncing(false);
    if (ok) {
      setLinkInput('');
      setSyncFeedback('Link açıldı, veriler eşitlendi.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } else {
      setLinkError('Link açılamadı. Linkin güncel olduğundan emin olun.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importVaultBackup(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Eşitleme ve Yedek
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Veriler şifreli saklanır, tüm cihazlarda anında güncellenir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Security Banner */}
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-3">
            <Key className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                Verileriniz Cihazınızda Şifrelenir
              </span>
              <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                Bütçe hareketleriniz, tasarruf hedefleriniz ve limitleriniz buluta gönderilmeden önce tarayıcınızda AES-256 ile şifrelenir. Bulut sunucusu şifreli verinin içeriğini asla göremez.
              </p>
            </div>
          </div>

          {/* Sync Status Box */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  syncConfig.status === 'synced'
                    ? 'bg-sky-500'
                    : syncConfig.status === 'syncing'
                    ? 'bg-amber-500 animate-spin'
                    : 'bg-rose-500'
                }`} />
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {syncConfig.status === 'synced'
                    ? 'Bulut ile Eşitlendi'
                    : syncConfig.status === 'syncing'
                    ? 'Buluta Eşitleniyor...'
                    : 'Eşitleme Uyarısı'}
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
                Son Eşitleme: {syncConfig.lastSyncedAt ? new Date(syncConfig.lastSyncedAt).toLocaleTimeString('tr-TR') : 'Henüz yapılmadı'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Eşitleniyor' : 'Şimdi Eşitle'}</span>
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {syncConfig.status === 'error' && syncConfig.errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              {syncConfig.errorMessage}
            </div>
          )}

          {/* Paylaşım linki */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Paylaşım Linki</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Başka birini eklemek için üstteki <b>Linki Paylaş</b> düğmesini kullanın. Size gönderilen bir linki bu cihazda açmak için buraya yapıştırın:
            </p>
            <form onSubmit={handleLinkDevice} className="flex gap-2">
              <input
                type="text"
                placeholder="Linki yapıştırın"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
              <button
                type="submit"
                disabled={isSyncing}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
              >
                Aç
              </button>
            </form>
            {linkError && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{linkError}</span>
              </div>
            )}
            <button
              type="button"
              disabled={rotating || !syncConfig.vaultId}
              onClick={async () => {
                if (
                  !window.confirm(
                    'Yeni bir paylaşım linki oluşturulacak. Eski link artık çalışmaz; bu cihaz dışındaki herkese yeni linki göndermeniz gerekir. Devam edilsin mi?'
                  )
                )
                  return;
                setRotating(true);
                try {
                  await rotatePassphrase();
                  setSyncFeedback('Yeni link oluşturuldu. "Linki Paylaş" ile diğer cihazlara yeniden gönderin.');
                } catch (err: any) {
                  alert(err.message || 'Link yenilenemedi.');
                } finally {
                  setRotating(false);
                }
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
            >
              {rotating ? 'Yenileniyor…' : 'Linki Yenile (eski link çalışmaz olur)'}
            </button>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <ExcelImportBar />
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <AutoBackups />
          </div>

          {/* Backup & Export Options */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Çevrimdışı Yedek & Dışa Aktarma
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={exportEncryptedVault}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>Şifreli Yedek (.enc)</span>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Excel / CSV</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.enc.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-600" />
                  <span>Yedeği Geri Yükle</span>
                </button>
              </div>
            </div>
          </div>
          {/* Reset all data */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-2">
              Verileri Sıfırla
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              Tüm harcama/gelir kayıtları, kredi kartları, taksitler, tasarruf hedefleri ve bütçe limitleri silinir. Aile üyeleri ve
              paylaşım linki korunur. Linki açan tüm cihazlar da sıfırlanır.
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Tüm harcama, gelir, kart, taksit, hedef ve limit kayıtları linki açan TÜM cihazlardan silinecek. Bu işlem geri alınamaz.\n\nÖnce "Şifreli Yedek" indirmeniz önerilir. Devam edilsin mi?'
                  )
                ) {
                  resetAllData();
                  setSyncFeedback('Tüm veriler sıfırlandı. Boş hali diğer cihazlara da gönderiliyor.');
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Verileri Sıfırla</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 dark:bg-neutral-200 dark:text-neutral-900 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useBudget } from '../../context/BudgetContext';
import {
  X,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Upload,
  FileSpreadsheet,
  Key,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  AlertCircle
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
    updateSyncCredentials,
    exportEncryptedVault,
    exportCsv,
    importVaultBackup
  } = useBudget();

  const [copiedVault, setCopiedVault] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // For linking other device
  const [linkVaultId, setLinkVaultId] = useState('');
  const [linkPassphrase, setLinkPassphrase] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'vault' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'vault') {
      setCopiedVault(true);
      setTimeout(() => setCopiedVault(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

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
    if (!linkVaultId.trim() || !linkPassphrase.trim()) {
      setLinkError('Lütfen Kasa Kodu ve Şifreleme Anahtarını giriniz.');
      return;
    }
    setLinkError(null);
    setIsSyncing(true);

    const ok = await syncFromCloud(linkVaultId.trim(), linkPassphrase.trim());
    setIsSyncing(false);
    if (ok) {
      setSyncFeedback('Cihaz başarıyla bağlandı ve veriler eşitlendi!');
      setTimeout(() => setSyncFeedback(null), 4000);
    } else {
      setLinkError('Bağlantı kurulamadı. Lütfen kodları kontrol ediniz.');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Uçtan Uca Şifreli Bulut Senkronizasyonu
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                AES-GCM 256-bit Sıfır-Bilgi (Zero-Knowledge) Aile Kasası
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
            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
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
                    ? 'bg-emerald-500'
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Eşitleniyor' : 'Şimdi Eşitle'}</span>
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {syncConfig.status === 'error' && syncConfig.errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              {syncConfig.errorMessage}
            </div>
          )}

          {/* Credentials Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Bu Cihazın Kasa Bilgileri
            </h4>

            {/* Vault ID */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Kasa Kimliği (Vault ID)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={syncConfig.vaultId}
                  className="flex-1 px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(syncConfig.vaultId, 'vault')}
                  className="px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  {copiedVault ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedVault ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* Master Key */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Şifreleme Anahtar Kelimesi (Passphrase)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  readOnly
                  value={syncConfig.passphrase}
                  className="flex-1 px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  title={showPassphrase ? 'Gizle' : 'Göster'}
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(syncConfig.passphrase, 'key')}
                  className="px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* Auto sync switch */}
            <div className="flex items-center justify-between pt-2">
              <label className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                Otomatik Arka Plan Eşitleme
              </label>
              <input
                type="checkbox"
                checked={syncConfig.autoSync}
                onChange={(e) =>
                  updateSyncCredentials(syncConfig.vaultId, syncConfig.passphrase, e.target.checked)
                }
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Link Other Device Section */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-neutral-500" />
              <span>Telefon veya Tableti Bağla</span>
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              Telefon veya tabletinizdeki Ailve uygulamasına bu Kasa Kimliği ve Şifreleme Anahtarını girerek tüm aile bütçenizi anında senkronize edebilirsiniz.
            </p>

            <form onSubmit={handleLinkDevice} className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Başka Kasa ID (örn: AILE-XXXX)"
                  value={linkVaultId}
                  onChange={(e) => setLinkVaultId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
                <input
                  type="text"
                  placeholder="Şifreleme Anahtarı"
                  value={linkPassphrase}
                  onChange={(e) => setLinkPassphrase(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>

              {linkError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{linkError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-2 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 transition-colors"
              >
                Bu Kasaya Bağlan & Verileri İçe Aktar
              </button>
            </form>
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
                <Download className="w-3.5 h-3.5 text-emerald-600" />
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

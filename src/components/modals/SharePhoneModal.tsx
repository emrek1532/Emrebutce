import React, { useState, useEffect } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import QRCode from 'qrcode';
import { buildShareLink } from '../../utils/shareLink';
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Monitor
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SharePhoneModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { syncConfig } = useBudget();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios'>('android');
  const [installSuccess, setInstallSuccess] = useState(false);

  // Dynamic Base URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Construct target link
  const shareUrl = syncConfig.vaultId ? buildShareLink(baseUrl, syncConfig) : baseUrl;

  // Generate QR Code
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [shareUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    const res = await install();
    if (res) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  };

  const handleOpenDirectly = () => {
    window.open(shareUrl, '_blank');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Cebim aile bütçemiz (bu linki Chrome'da aç):\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(
      `Cebim aile bütçemiz (bu linki Chrome'da aç):\n${shareUrl}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Linki Paylaş
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Linki açan herkes aynı verileri görür
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Native Install Button (if browser triggered beforeinstallprompt) */}
          {isInstallable && !isInstalled && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200">
                    Chrome Yüklemeye Hazır!
                  </h4>
                  <p className="text-[11px] text-sky-800 dark:text-sky-300">
                    Bu cihazın ana ekranına tam uygulama olarak ekleyebilirsiniz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNativeInstall}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors shrink-0 shadow-xs"
              >
                Hemen Yükle
              </button>
            </div>
          )}

          {installSuccess && (
            <div className="p-3 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-100 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span>Uygulama başarıyla cihazınıza yüklendi!</span>
            </div>
          )}

          {/* QR Code Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
            {/* QR Card */}
            <div className="bg-white p-2.5 rounded-xl border border-neutral-200 shadow-xs shrink-0 flex flex-col items-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Uygulama QR Kodu"
                  className="w-40 h-40 rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-neutral-400">
                  <QrCode className="w-8 h-8 animate-pulse" />
                </div>
              )}
              <span className="text-[10px] text-neutral-500 font-medium mt-1">
                Kameranla Tara & Aç
              </span>
            </div>

            {/* QR Description */}
            <div className="space-y-3 text-left w-full">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Telefon Kamerasıyla Açın
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  Telefonunuzun kamerasını QR koda tuttuğunuzda doğrudan Chrome veya Safari tarayıcınızda açılır.
                </p>
              </div>

              <p className="pt-2 border-t border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-500 dark:text-neutral-400">
                Bu linki açan kişi sizinle aynı verileri görür ve değişiklikler herkese anında yansır. Linki sadece ailenizle paylaşın.
              </p>
            </div>
          </div>

          {/* Direct Link & Share Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Doğrudan Paylaşım Linki
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-700 flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-sky-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>

            {/* Quick Messengers */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp'ta Aç</span>
              </button>
              <button
                type="button"
                onClick={handleTelegramShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Telegram'da Aç</span>
              </button>
            </div>
          </div>

          {/* Platform Guide Tabs */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Adım Adım Yükleme Rehberi
              </span>

              <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                    activePlatform === 'android'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Android (Chrome)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                    activePlatform === 'ios'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  iPhone (Safari)
                </button>
              </div>
            </div>

            {activePlatform === 'android' ? (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    Telefonunuzda Chrome ile yukarıdaki <strong>QR kodu okutun</strong> veya linki açın.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    Chrome'un sağ üst köşesindeki <strong>üç nokta (⋮)</strong> menüsüne basıp <strong>"Yükle ve kısayol oluştur"</strong> veya <strong>"Ana ekrana ekle"</strong> seçeneğine dokunun.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    Açılan pencerede 2. sırada yer alan <strong>"Kısayol oluştur"</strong> butonuna ve ardından <strong>"Ekle"</strong>ye dokunun.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    4
                  </span>
                  <p>
                    Ana ekranınızda mavi cüzdan logolu <strong>Cebim</strong> belirecektir. Tıkladığınızda bağımsız, adres çubuğu olmayan yerel bir uygulama gibi açılır.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    Linki iPhone'unuzda <strong>Safari</strong> ile açın.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    Alttaki <strong>Paylaş</strong> simgesine dokunun (kare içerisinden yukarı ok çıkan simge).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    Aşağı kaydırıp <strong>"Ana Ekrana Ekle" (Add to Home Screen)</strong> seçeneğine dokunun.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 dark:bg-neutral-200 dark:text-neutral-900 transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

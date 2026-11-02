import React, { useRef, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Download, FileSpreadsheet } from 'lucide-react';

// Boş şablonu indir + doldurulmuş Excel'i yükle
export const ExcelImportBar: React.FC = () => {
  const { importExcel } = useBudget();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setBusy(true);
    try {
      alert(await importExcel(file));
    } catch (err: any) {
      alert(`Excel yüklenemedi: ${err.message || 'Dosya okunamadı.'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/30">
      <p className="text-xs text-neutral-600 dark:text-neutral-300">
        <b>Excel ile toplu giriş:</b> şablonu indirip doldurun, sonra yükleyin. Tekrar yüklerseniz kayıtlar çoğalmaz, güncellenir.
      </p>
      <div className="flex gap-2 shrink-0">
        <a
          href="/cebim-veri-sablonu.xlsx"
          download
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
        >
          <Download className="w-3.5 h-3.5 text-sky-600" /> Boş Şablon
        </a>
        <input ref={inputRef} type="file" accept=".xlsx" onChange={onFile} className="hidden" />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> {busy ? 'Yükleniyor…' : "Excel'den Yükle"}
        </button>
      </div>
    </div>
  );
};

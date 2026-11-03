import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { EXPENSE_CATEGORIES } from '../../data/initialData';
import { parseStatementLines, pdfLines, StatementLine } from '../../utils/statementParser';
import { formatCurrency } from '../../utils/currencies';
import { FileText, X } from 'lucide-react';

// Kart/banka ekstresi PDF'inden harcamaları okuyup seçilenleri işlem olarak ekler (cihazda, yapay zekâsız)
export const StatementImportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { creditCards, familyMembers, importTransactions } = useBudget();
  const [lines, setLines] = useState<StatementLine[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [cardName, setCardName] = useState(creditCards[0] ? `${creditCards[0].bank} ${creditCards[0].name}` : '');
  const [member, setMember] = useState(familyMembers[0]?.name ?? 'Ortak');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async (file: File, password?: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const parsed = parseStatementLines(await pdfLines(file, password));
      if (parsed.length === 0) throw new Error('Bu PDF\'te tarih ve tutar içeren harcama satırı bulunamadı.');
      setLines(parsed);
      setSelected(Object.fromEntries(parsed.map((l) => [l.key, !l.likelyNotExpense])));
      setCategories(Object.fromEntries(parsed.map((l) => [l.key, l.category])));
    } catch (e: any) {
      if (e?.name === 'PasswordException') {
        const pw = window.prompt('PDF şifreli. Şifresini girin (genelde T.C. kimlik no / doğum tarihi):');
        if (pw) return read(file, pw);
      }
      setError(e?.message || 'PDF okunamadı.');
    } finally {
      setBusy(false);
    }
  };

  const chosen = useMemo(() => (lines ?? []).filter((l) => selected[l.key]), [lines, selected]);
  const total = chosen.reduce((s, l) => s + l.amount, 0);

  const save = () => {
    const now = new Date().toISOString();
    const added = importTransactions(
      chosen.map((l) => ({
        id: `stmt-${l.key.replace(/[^a-z0-9çğıöşü]+/gi, '-').slice(0, 90)}`,
        type: 'expense',
        amount: l.amount,
        currency: 'TRY',
        category: categories[l.key] || l.category,
        member,
        date: l.date,
        description: cardName ? `${l.description} (${cardName})` : l.description,
        paymentMethod: 'Kredi Kartı',
        installmentInfo: l.installment ? { current: l.installment.current, total: l.installment.total } : undefined,
        createdAt: now
      }))
    );
    alert(`${added} harcama eklendi${chosen.length - added > 0 ? `, ${chosen.length - added} tanesi zaten vardı` : ''}. Kart borcu değişmedi; borcu kart kartındaki tutar belirler.`);
    onClose();
  };

  const input = 'px-2 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" /> Ekstre PDF'inden Harcama Ekle
          </h4>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {!lines && (
            <>
              <p className="text-xs text-neutral-500">
                Bankanın gönderdiği kart ekstresi PDF'ini seçin. Dosya bu cihazda okunur, hiçbir yere gönderilmez. Satırları kontrol edip
                istediklerinizi ekleyebilirsiniz.
              </p>
              <input type="file" accept="application/pdf" disabled={busy} onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} className="text-xs" />
              {busy && <p className="text-xs text-neutral-500">Okunuyor…</p>}
            </>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
          {lines && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-neutral-500">
                  Kart
                  <select className={`${input} w-full`} value={cardName} onChange={(e) => setCardName(e.target.value)}>
                    <option value="">Belirtme</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={`${c.bank} ${c.name}`}>{c.bank} {c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-neutral-500">
                  Kimin
                  <select className={`${input} w-full`} value={member} onChange={(e) => setMember(e.target.value)}>
                    {Array.from(new Set([...familyMembers.map((m) => m.name), 'Ortak'])).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
              </div>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                {lines.map((l) => (
                  <li key={l.key} className={`px-3 py-2 flex items-center gap-2 text-xs ${selected[l.key] ? '' : 'opacity-50'}`}>
                    <input type="checkbox" checked={!!selected[l.key]} onChange={(e) => setSelected((s) => ({ ...s, [l.key]: e.target.checked }))} />
                    <span className="w-20 shrink-0 font-mono text-neutral-500">{l.date.split('-').reverse().join('.')}</span>
                    <span className="flex-1 min-w-0 truncate" title={l.description}>{l.description}</span>
                    <select
                      className={`${input} hidden sm:block w-36`}
                      value={categories[l.key]}
                      onChange={(e) => setCategories((c) => ({ ...c, [l.key]: e.target.value }))}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <span className="w-24 text-right font-mono font-semibold">{formatCurrency(l.amount, 'TRY')}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-neutral-500">
                Karta ödeme, iade, faiz gibi satırlar seçili gelmez. Eklenen harcamalar kart borcunu artırmaz (borç kart kartındaki tutardır).
              </p>
            </>
          )}
        </div>
        {lines && (
          <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              {chosen.length} satır · <b>{formatCurrency(total, 'TRY')}</b>
            </span>
            <button type="button" disabled={chosen.length === 0} onClick={save} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-50">
              Seçilenleri ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

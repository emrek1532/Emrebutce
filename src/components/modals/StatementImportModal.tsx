import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { EXPENSE_CATEGORIES } from '../../data/initialData';
import { parseStatementLines, parseStatementSummary, pdfLines, StatementLine, StatementSummary } from '../../utils/statementParser';
import { formatCurrency } from '../../utils/currencies';
import { lastStatementKey } from '../../utils/cardStatement';
import { learnedCategory } from '../../utils/categoryMemory';
import { FileText, X } from 'lucide-react';

// Kart/banka ekstresi PDF'inden harcamaları okuyup seçilenleri işlem olarak ekler (cihazda, yapay zekâsız)
export const StatementImportModal: React.FC<{ onClose: () => void; initialCardId?: string }> = ({ onClose, initialCardId }) => {
  const { creditCards, familyMembers, importTransactions, updateCreditCard, transactions } = useBudget();
  const [lines, setLines] = useState<StatementLine[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [cardId, setCardId] = useState(initialCardId ?? creditCards[0]?.id ?? '');
  const card = creditCards.find((c) => c.id === cardId);
  const cardName = card ? (card.name.toLocaleLowerCase('tr-TR').includes(card.bank.toLocaleLowerCase('tr-TR')) ? card.name : `${card.bank} ${card.name}`) : '';
  // Ekstre özeti: kartın dönem borcu, tarihleri ve limiti bununla güncellenir
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [updateCard, setUpdateCard] = useState(true);
  const [debtText, setDebtText] = useState('');
  const [paidText, setPaidText] = useState('0');
  const [member, setMember] = useState(familyMembers[0]?.name ?? 'Ortak');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async (file: File, password?: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const raw = await pdfLines(file, password);
      const parsed = parseStatementLines(raw);
      const sum = parseStatementSummary(raw);
      if (parsed.length === 0 && sum.statementDebt === undefined) throw new Error('Bu PDF\'te tarih ve tutar içeren harcama satırı bulunamadı.');
      setSummary(sum);
      if (sum.statementDebt !== undefined) setDebtText(sum.statementDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 }));
      // Ekstredeki bankaya uyan kartı seç
      // "isbank" ↔ "İş Bankası" eşleşsin diye Türkçe harfler sadeleştirilir
      const fold = (t: string) =>
        t
          .toLocaleLowerCase('tr-TR')
          .replace(/[\s.]/g, '')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ç/g, 'c')
          .replace(/ğ/g, 'g')
          .replace(/ö/g, 'o')
          .replace(/ü/g, 'u')
          .replace(/bankasi/g, 'bank');
      const hint = sum.bankHint ? fold(sum.bankHint) : undefined;
      const match = hint ? creditCards.find((c) => fold(`${c.bank}${c.name}`).includes(hint)) : undefined;
      const target = match ?? card;
      if (match) setCardId(match.id);
      // Aynı ekstre daha önce işlendiyse o dönemde yapılan ödemeyi öner
      const cutKey = sum.statementDate?.slice(0, 7);
      if (target && cutKey && target.statementKey === cutKey && target.statementTotal !== undefined && target.statementDebt !== undefined) {
        setPaidText(String(Math.max(0, Math.round((target.statementTotal - target.statementDebt) * 100) / 100)).replace('.', ','));
      }
      setLines(parsed);
      setSelected(Object.fromEntries(parsed.map((l) => [l.key, !l.likelyNotExpense])));
      // Daha önce aynı yerden yapılan harcamanın kategorisi varsa o önerilir
      setCategories(Object.fromEntries(parsed.map((l) => [l.key, learnedCategory(l.description, transactions, 'expense', EXPENSE_CATEGORIES) ?? l.category])));
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

  const num = (t: string) => {
    const s = t.trim().replace(/\s/g, '');
    return s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s) || 0;
  };
  const canUpdateCard = !!card && !!summary && summary.statementDebt !== undefined;

  const applyCard = () => {
    if (!card || !summary) return '';
    const total = num(debtText);
    if (!(total >= 0)) return '';
    const remaining = Math.max(0, Math.round((total - num(paidText)) * 100) / 100);
    const cut = summary.statementDate;
    const periodAfterCut = cut
      ? transactions
          .filter((t) => t.type === 'expense' && t.cardId === card.id && t.date > cut)
          .reduce((s, t) => s + t.amount, 0)
      : Math.max(0, card.currentDebt - (card.statementDebt ?? card.currentDebt));
    const due = summary.dueDate;
    updateCreditCard({
      ...card,
      statementTotal: total,
      statementDebt: remaining,
      statementKey: cut ? cut.slice(0, 7) : card.statementKey,
      statementCheckedKey: cut ? cut.slice(0, 7) : lastStatementKey(card),
      statementDay: cut ? Number(cut.slice(8, 10)) : card.statementDay,
      dueDay: due ? Number(due.slice(8, 10)) : card.dueDay,
      limit: summary.limit ?? card.limit,
      statementMinimum: summary.minimumPayment,
      // Ekstredeki taksitlerin kalanları (ör. 4/6 → 2 taksit daha) kullanılabilir limitten düşer
      futureInstallments: Math.round(
        (lines ?? []).reduce((s, l) => s + (l.remaining ?? (l.installment ? l.amount * (l.installment.total - l.installment.current) : 0)), 0) * 100
      ) / 100,
      // Güncel borç = ekstreden kalan + kesimden SONRA bu kartla yapılan harcamalar (dönem içi)
      currentDebt: Math.round((remaining + periodAfterCut) * 100) / 100
    });
    return ` ${cardName} kartı güncellendi: ekstre ${total.toLocaleString('tr-TR')} ₺, kalan ${remaining.toLocaleString('tr-TR')} ₺.`;
  };

  const save = () => {
    const now = new Date().toISOString();
    // Daha önce ekstreden eklenmiş aynı tarih + tutarlı satır tekrar eklenmez
    // (okuma kuralları değişip açıklama farklı çıksa bile). Aynı gün aynı tutarlı iki harcama ayrı ayrı sayılır.
    const existing = new Map<string, number>();
    for (const t of transactions) {
      if (!t.id.startsWith('stmt-')) continue;
      const k = `${t.date}|${t.amount.toFixed(2)}`;
      existing.set(k, (existing.get(k) ?? 0) + 1);
    }
    // Taksitli alışveriş elle tamamı girilmiş olabilir (ör. 3.504,99 ₺, 6 taksit); ekstrede aynı gün
    // tarihli "1/6 taksit 584,17 ₺" satırı o kaydın taksitidir, yeni harcama değildir.
    const usedWhole = new Set<string>();
    const wholeMatch = (l: StatementLine) =>
      l.installment
        ? transactions.find(
            (t) =>
              !usedWhole.has(t.id) &&
              t.type === 'expense' &&
              t.date === l.date &&
              Math.abs(t.amount - l.amount * l.installment!.total) <= l.installment!.total * 0.02
          )
        : undefined;
    const fresh = chosen.filter((l) => {
      const k = `${l.date}|${l.amount.toFixed(2)}`;
      const n = existing.get(k) ?? 0;
      if (n > 0) {
        existing.set(k, n - 1);
        return false;
      }
      const whole = wholeMatch(l);
      if (whole) {
        usedWhole.add(whole.id);
        return false;
      }
      return true;
    });
    const added = importTransactions(
      fresh.map((l) => ({
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
    const cardMsg = canUpdateCard && updateCard ? applyCard() : '';
    alert(`${added} harcama eklendi${chosen.length - added > 0 ? `, ${chosen.length - added} tanesi zaten vardı` : ''}.${cardMsg}`);
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
                  <select className={`${input} w-full`} value={cardId} onChange={(e) => setCardId(e.target.value)}>
                    <option value="">Belirtme</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.bank} {c.name}</option>
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
              {summary && summary.statementDebt !== undefined && (
                <div className="p-3 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/30 space-y-2 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
                    <input type="checkbox" checked={updateCard && canUpdateCard} disabled={!card} onChange={(e) => setUpdateCard(e.target.checked)} />
                    {card ? `${cardName} kartını ekstreyle güncelle` : 'Kartı güncellemek için yukarıdan kart seçin'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-600 dark:text-neutral-300">
                    <label>
                      Dönem borcu (₺)
                      <input className={`${input} w-full`} inputMode="decimal" value={debtText} onChange={(e) => setDebtText(e.target.value)} />
                    </label>
                    <label>
                      Ekstreden sonra ödenen (₺)
                      <input className={`${input} w-full`} inputMode="decimal" value={paidText} onChange={(e) => setPaidText(e.target.value)} />
                    </label>
                    <div>
                      Kesim / son ödeme
                      <div className="font-mono py-1.5">
                        {summary.statementDate?.split('-').reverse().join('.') ?? '—'} / {summary.dueDate?.split('-').reverse().join('.') ?? '—'}
                      </div>
                    </div>
                    <div>
                      Asgari / limit
                      <div className="font-mono py-1.5">
                        {summary.minimumPayment?.toLocaleString('tr-TR') ?? '—'} / {summary.limit?.toLocaleString('tr-TR') ?? '—'}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Kartın ekstre borcu, asgari ödemesi, kesim ve son ödeme günü bu bilgilerle güncellenir; kalan = dönem borcu − ekstreden sonra ödenen.
                  </p>
                </div>
              )}
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
                Karta ödeme, iade gibi satırlar seçili gelmez. Eklenen harcamalar kart borcunu ayrıca artırmaz; borç yukarıdaki ekstre bilgisinden gelir.
              </p>
            </>
          )}
        </div>
        {lines && (
          <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              {chosen.length} satır · <b>{formatCurrency(total, 'TRY')}</b>
            </span>
            <button type="button" disabled={chosen.length === 0 && !(canUpdateCard && updateCard)} onClick={save} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-50">
              {canUpdateCard && updateCard ? 'Ekle ve kartı güncelle' : 'Seçilenleri ekle'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

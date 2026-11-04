import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { AskAnswer, buildAskItems, computeAnswer, toWire } from '../../utils/askBudget';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { Search, Sparkles } from 'lucide-react';

const EXAMPLES = ['Bu ay arkadaş kartlarına ne kadar ödeyeceğim?', 'Toplam kredi borcum ne kadar?', 'Eminevim ne zaman bitiyor?'];

// Bütçeye soru sor: ilgili kalemler cihazda hazırlanır, yapay zekâ seçer, toplamı cihaz hesaplar
export const AskBox: React.FC = () => {
  const { installments, creditCards, recurring, transactions, currency } = useBudget();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text) return;
    setQ(text);
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const items = buildAskItems(text, { installments, creditCards, recurring, transactions });
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, today: new Date().toISOString().slice(0, 10), items: toWire(items) })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error(data?.message || 'Soru yanıtlanamadı, biraz sonra tekrar deneyin.');
      setAnswer(computeAnswer(items, data));
    } catch (e: any) {
      setError(e.message || 'Soru yanıtlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2"
      >
        <div className="flex-1 flex items-center gap-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sorun: bu ay arkadaş kartlarına ne kadar ödeyeceğim?"
            className="flex-1 min-w-0 py-2.5 bg-transparent text-sm outline-none"
          />
        </div>
        <button type="submit" disabled={busy || !q.trim()} className="px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-50">
          {busy ? '…' : 'Sor'}
        </button>
      </form>
      {!answer && !busy && !error && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => ask(e)} className="px-2.5 py-1 rounded-full text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
              {e}
            </button>
          ))}
        </div>
      )}
      {busy && <p className="text-xs text-neutral-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 animate-pulse" /> Hesaplanıyor…</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {answer && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            {answer.intro}
            {answer.total !== undefined && (
              <>
                : <b className="font-mono text-sky-700 dark:text-sky-300">{money(answer.total)}</b>
              </>
            )}
          </p>
          {answer.rows.length > 0 && (
            <ul className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
              {answer.rows.map((r, i) => (
                <li key={i} className="py-1 flex justify-between gap-2">
                  <span className="text-neutral-600 dark:text-neutral-400 truncate">{r.label}</span>
                  <span className="font-mono">{typeof r.value === 'number' ? money(r.value) : r.value}</span>
                </li>
              ))}
            </ul>
          )}
          {answer.note && <p className="text-[11px] text-neutral-500">{answer.note}</p>}
          <p className="text-[10px] text-neutral-400">Kalemleri yapay zekâ seçti, toplamı uygulama hesapladı. Yanlış kalem varsa soruyu biraz farklı sorun.</p>
        </div>
      )}
    </div>
  );
};

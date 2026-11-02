import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { buildReminders, disablePush, enablePush, pushEnabled, pushSupported, upcoming } from '../../utils/paymentReminders';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { BellRing, BellOff, CalendarClock } from 'lucide-react';

// Önümüzdeki 7 gün içindeki ödemeler + telefon bildirimi aç/kapa
export const UpcomingPayments: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { creditCards, installments, recurring, transactions, currency, syncConfig } = useBudget();
  const reminders = useMemo(
    () => buildReminders({ creditCards, installments, recurring, transactions }),
    [creditCards, installments, recurring, transactions]
  );
  const list = useMemo(() => upcoming(reminders, 7), [reminders]);
  const [on, setOn] = useState(pushEnabled());
  const [busy, setBusy] = useState(false);
  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);
  const when = (d: number) => (d === 0 ? 'Bugün' : d === 1 ? 'Yarın' : `${d} gün`);

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
      } else {
        await enablePush(syncConfig.vaultId, reminders);
        setOn(true);
        alert('Ödeme hatırlatmaları açıldı. Her sabah 09:00\'da son ödeme tarihine 3 gün, 1 gün kala ve ödeme günü bildirim gelir.');
      }
    } catch (err: any) {
      alert(err.message || 'Bildirim açılamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${compact ? 'p-3' : 'p-4'} space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-rose-500" /> Yaklaşan Ödemeler (7 gün)
        </h4>
        {pushSupported() && syncConfig.vaultId && (
          <button
            type="button"
            disabled={busy}
            onClick={toggle}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg disabled:opacity-50 ${
              on ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' : 'bg-sky-600 text-white'
            }`}
          >
            {on ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            {on ? 'Bildirim açık' : 'Telefona bildirim aç'}
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-neutral-500">Önümüzdeki 7 günde ödeme görünmüyor.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {list.map((r) => (
            <li key={r.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">
                <span className={`inline-block w-14 font-semibold ${r.days <= 1 ? 'text-rose-600' : 'text-amber-600'}`}>{when(r.days)}</span>
                <span className="text-neutral-800 dark:text-neutral-200">{r.title}</span>
              </span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 shrink-0">{money(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CreditCardAccount, InstallmentDebt, RecurringItem } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { CreditCardModal, InstallmentModal, RecurringModal } from '../modals/DebtModals';
import { ExcelImportBar } from '../common/ExcelImportBar';
import { UpcomingPayments } from '../common/UpcomingPayments';
import { budgetMonthOf } from '../../utils/budgetMonth';
import { minimumPaymentOf, minimumRateOf, periodSpendOf, statementDebtOf } from '../../utils/cardStatement';
import { CreditCard, Calendar, CheckCircle2, Plus, Pencil, Trash2, TrendingDown, Repeat } from 'lucide-react';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Bugünden sonraki ilk "ayın N'si" ve kalan gün
function nextDayOfMonth(day: number): { date: Date; daysLeft: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const build = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, last));
  };
  let date = build(today.getFullYear(), today.getMonth());
  if (date < today) date = build(today.getFullYear(), today.getMonth() + 1);
  return { date, daysLeft: Math.round((date.getTime() - today.getTime()) / 86400000) };
}

function formatShortDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Değişken planda (ör. Eminevim) toplam dönem sayısı plandan, tutar sıradaki dönemden gelir
function totalOf(inst: InstallmentDebt) {
  return inst.schedule ? inst.schedule.length : inst.totalInstallments;
}

function currentAmount(inst: InstallmentDebt) {
  return inst.schedule ? inst.schedule.find((s) => !s.paid)?.amount ?? 0 : inst.monthlyAmount;
}

function isActive(inst: InstallmentDebt) {
  return totalOf(inst) ? (inst.remainingInstallments ?? 0) > 0 : true;
}

export const InstallmentsView: React.FC = () => {
  const {
    installments,
    creditCards,
    currency,
    markInstallmentPaid,
    undoInstallmentPayment,
    isInstallmentPaidThisMonth,
    deleteInstallment,
    deleteCreditCard,
    payCardDebt,
    recurring,
    deleteRecurring,
    transactions
  } = useBudget();
  const [recModal, setRecModal] = useState<{ open: boolean; item: RecurringItem | null }>({ open: false, item: null });
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [cardModal, setCardModal] = useState<{ open: boolean; card: CreditCardAccount | null }>({ open: false, card: null });
  const [instModal, setInstModal] = useState<{ open: boolean; inst: InstallmentDebt | null }>({ open: false, inst: null });

  const money = (tryAmount: number) => formatCurrency(convertCurrency(tryAmount, 'TRY', currency), currency);

  const activeInstallments = installments.filter(isActive);
  const monthlyLoad = activeInstallments.reduce((sum, i) => sum + currentAmount(i), 0);
  // Kira, abonelik gibi her ay tekrarlayan giderler (taksitler hariç)
  const monthlyFixed = recurring.filter((r) => r.active && r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  const totalCardDebt = creditCards.reduce((sum, c) => sum + c.currentDebt, 0);
  const totalCardLimit = creditCards.reduce((sum, c) => sum + c.limit, 0);

  // Biten taksitlerin aylık bütçede açacağı yer, bitiş ayına göre
  const reliefByMonth = new Map<string, { label: string; amount: number; titles: string[] }>();
  activeInstallments
    .filter((i) => totalOf(i) && i.endDate)
    .forEach((i) => {
      const [y, m] = i.endDate.split('-').map(Number);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const entry = reliefByMonth.get(key) || { label: `${MONTHS[m - 1]} ${y}`, amount: 0, titles: [] };
      entry.amount += currentAmount(i);
      entry.titles.push(i.title);
      reliefByMonth.set(key, entry);
    });
  const relief = Array.from(reliefByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)
    .map(([, v]) => v);

  const confirmDelete = (label: string, action: () => void) => {
    if (window.confirm(`"${label}" silinsin mi?`)) action();
  };

  return (
    <div className="space-y-6">
      {/* Özet */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>Kredi Kartları & Taksitler</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Kartlarınızı ve taksitli borçlarınızı ekleyin; ödeme günleri ve bitiş tarihleri otomatik takip edilir.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
              Aylık Taksit Yükü
            </span>
            <span className="text-lg font-bold font-mono text-sky-700 dark:text-sky-300">{money(monthlyLoad)}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Aylık Sabit Gider
            </span>
            <span className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">{money(monthlyFixed)}</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 border border-neutral-900 dark:border-neutral-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300 dark:text-neutral-600 block">
              Aylık Toplam Yük
            </span>
            <span className="text-lg font-bold font-mono text-white dark:text-neutral-900">{money(monthlyLoad + monthlyFixed)}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Toplam Kart Borcu
            </span>
            <span className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">{money(totalCardDebt)}</span>
          </div>
        </div>
      </div>

      <UpcomingPayments />

      <ExcelImportBar />

      {/* Düzenli gelir & giderler */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-sky-600" />
            Düzenli Gelir & Giderler
          </h3>
          <button
            type="button"
            onClick={() => setRecModal({ open: true, item: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ekle</span>
          </button>
        </div>
        {recurring.length === 0 ? (
          <p className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
            Maaş, kira gibi her ay tekrarlayan kalemleri ekleyin; günü gelince kendiliğinden işlem olarak kaydedilir.
          </p>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
            {recurring.map((r) => {
              const carry = r.type === 'income' && r.countForNextMonth;
              const posted = transactions.some((t) => t.id.startsWith(`rec-${r.id}-`) && budgetMonthOf(t) === monthKey);
              const skipped = r.skipMonths?.includes(monthKey);
              return (
                <div key={r.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${r.active ? '' : 'opacity-50'}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{r.title}</div>
                    <div className="text-[11px] text-neutral-500">
                      Her ayın {r.dayOfMonth}'i{carry ? ' · sonraki aya sayılır' : ''} · {r.member} ·{' '}
                      {!r.active
                        ? 'Pasif'
                        : posted
                          ? 'Bu ayın bütçesinde ✓'
                          : skipped
                            ? 'Bu ay atlandı'
                            : `${r.dayOfMonth}'inde eklenecek`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold font-mono ${r.type === 'income' ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {r.type === 'income' ? '+' : '-'}
                      {money(r.amount)}
                    </span>
                    <button type="button" title="Düzenle" onClick={() => setRecModal({ open: true, item: r })} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Sil" onClick={() => confirmDelete(r.title, () => deleteRecurring(r.id))} className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Kredi kartları */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Kredi Kartlarım
            {totalCardLimit > 0 && (
              <span className="ml-2 text-xs font-normal text-neutral-500">
                Limit doluluğu %{Math.round((totalCardDebt / totalCardLimit) * 100)}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => setCardModal({ open: true, card: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kart Ekle</span>
          </button>
        </div>

        {creditCards.length === 0 ? (
          <p className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
            Henüz kart eklenmedi. "Kart Ekle" ile bankayı, limiti, güncel borcu ve son ödeme gününü girin.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {creditCards.map((card) => {
              const usage = card.limit > 0 ? Math.min(100, (card.currentDebt / card.limit) * 100) : 0;
              const due = nextDayOfMonth(card.dueDay);
              const stmt = statementDebtOf(card);
              const minimum = minimumPaymentOf(card);
              const period = periodSpendOf(card);
              const urgent = stmt > 0 && due.daysLeft <= 3;
              return (
                <div key={card.id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {card.bank}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1.5">
                        {card.name}
                        <span className="ml-1.5 text-[11px] font-normal text-neutral-500">· {card.member}</span>
                      </h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" title="Düzenle" onClick={() => setCardModal({ open: true, card })} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" title="Sil" onClick={() => confirmDelete(card.name, () => deleteCreditCard(card.id))} className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-neutral-500">Borç</span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {money(card.currentDebt)}
                        {card.limit > 0 && <span className="text-neutral-400 font-normal"> / {money(card.limit)}</span>}
                      </span>
                    </div>
                    {card.limit > 0 && (
                      <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${usage >= 90 ? 'bg-rose-500' : usage >= 70 ? 'bg-amber-500' : 'bg-sky-500'}`}
                          style={{ width: `${usage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40">
                      <span className="text-rose-700 dark:text-rose-300 block">Ekstre borcu</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{money(stmt)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                      <span className="text-amber-700 dark:text-amber-300 block">Asgari (%{Math.round(minimumRateOf(card) * 100)})</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{money(minimum)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60">
                      <span className="text-neutral-500 block">Dönem içi</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{money(period)}</span>
                    </div>
                  </div>

                  {card.currentDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const raw = window.prompt(
                          `${card.bank} ${card.name} için ödediğiniz tutar (₺):\nEkstre: ${money(stmt)} · Asgari: ${money(minimum)}`,
                          String(stmt || card.currentDebt)
                        );
                        if (!raw) return;
                        const s = raw.trim().replace(/\s/g, '');
                        const amount = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : /^\d{1,3}(\.\d{3})+$/.test(s) ? Number(s.replace(/\./g, '')) : Number(s);
                        if (!(amount > 0)) return alert('Geçerli bir tutar girin.');
                        const record = window.confirm(
                          'Bu ödeme gider olarak da kaydedilsin mi?\n\nKartla yaptığınız harcamaları uygulamaya tek tek girmediyseniz "Tamam" deyin. Girdiyseniz "İptal" deyin; aksi halde aynı harcama iki kez sayılır.'
                        );
                        payCardDebt(card.id, amount, record);
                      }}
                      className="w-full py-1.5 text-[11px] font-semibold rounded-lg border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                    >
                      Borç Öde
                    </button>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-neutral-500">Ekstre: her ayın {card.statementDay}'i</span>
                    <span className={`font-semibold flex items-center gap-1 ${urgent ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      <Calendar className="w-3 h-3" />
                      Son ödeme {formatShortDate(due.date)}
                      {due.daysLeft === 0 ? ' (bugün)' : ` (${due.daysLeft} gün)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Taksitler */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Taksitler & Krediler</h3>
          <button
            type="button"
            onClick={() => setInstModal({ open: true, inst: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Taksit Ekle</span>
          </button>
        </div>

        {installments.length === 0 ? (
          <p className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
            Henüz taksit eklenmedi. Taksitli alışverişlerinizi, kredilerinizi ve yapılandırmalarınızı "Taksit Ekle" ile girin.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {installments.map((inst) => {
              const active = isActive(inst);
              const paid = inst.paidInstallments ?? 0;
              const next = nextDayOfMonth(inst.paymentDayOfMonth || 1);
              return (
                <div
                  key={inst.id}
                  className={`p-4 rounded-xl border bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between gap-3 ${
                    active ? 'border-neutral-200 dark:border-neutral-800' : 'border-sky-200 dark:border-sky-900 opacity-70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {inst.creditor}
                      </span>
                      <div className="flex items-center gap-1">
                        <button type="button" title="Düzenle" onClick={() => setInstModal({ open: true, inst })} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" title="Sil" onClick={() => confirmDelete(inst.title, () => deleteInstallment(inst.id))} className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {inst.title}
                      <span className="ml-1.5 text-[11px] font-normal text-neutral-500">· {inst.member}</span>
                    </h4>
                    {inst.notes && <p className="text-xs text-neutral-500 dark:text-neutral-400">{inst.notes}</p>}
                    {totalOf(inst) ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-neutral-400">{inst.schedule ? 'Dönem ' : ''}{paid} / {totalOf(inst)} ödendi</span>
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                            {active ? `${inst.remainingInstallments} taksit kaldı` : 'Bitti'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, (paid / (totalOf(inst) || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500">Süresiz (her ay devam ediyor)</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">Aylık</span>
                      <span className="text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                        {money(currentAmount(inst))}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        {active ? `Sonraki: ${formatShortDate(next.date)}` : ''}
                        {inst.endDate ? ` · Bitiş: ${inst.endDate.split('-').reverse().join('.')}` : ''}
                      </span>
                    </div>
                    {isInstallmentPaidThisMonth(inst.id) ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Bu ay ödendi
                        </span>
                        <button
                          type="button"
                          onClick={() => undoInstallmentPayment(inst.id)}
                          className="text-[10px] text-neutral-500 hover:text-rose-600 underline"
                        >
                          Geri al
                        </button>
                      </div>
                    ) : (
                      active && (
                        <button
                          type="button"
                          onClick={() => markInstallmentPaid(inst.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Bu ayı öde</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bitiş takvimi */}
      {relief.length > 0 && (
        <section className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Borç Bitiş Takvimi</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relief.map((r) => (
              <div key={r.label} className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">{r.label}</span>
                <span className="text-sm font-bold font-mono text-sky-700 dark:text-sky-300 block mt-0.5">+{money(r.amount)} / ay rahatlama</span>
                <span className="text-[11px] text-neutral-500 block mt-0.5">{r.titles.join(', ')} bitiyor</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <CreditCardModal isOpen={cardModal.open} editCard={cardModal.card} onClose={() => setCardModal({ open: false, card: null })} />
      <RecurringModal isOpen={recModal.open} editItem={recModal.item} onClose={() => setRecModal({ open: false, item: null })} />
      <InstallmentModal isOpen={instModal.open} editInstallment={instModal.inst} onClose={() => setInstModal({ open: false, inst: null })} />
    </div>
  );
};

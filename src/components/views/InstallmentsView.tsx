import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CreditCardAccount, InstallmentDebt, RecurringItem } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import { CreditCardModal, InstallmentModal, RecurringModal } from '../modals/DebtModals';
import { StatementImportModal } from '../modals/StatementImportModal';
import { DebtPlanner } from './DebtPlanner';
import { SubscriptionsCard } from '../common/SubscriptionsCard';
import { DebtPayoffChart } from '../charts/DebtPayoffChart';
import { budgetMonthOf, monthKeyOf } from '../../utils/budgetMonth';
import { availableLimitOf, lastStatementKey, minimumPaymentOf, minimumRateOf, periodSpendOf, statementDebtOf } from '../../utils/cardStatement';
import { CreditCard, Calendar, CheckCircle2, Plus, Pencil, Trash2, TrendingDown, Repeat, FileText } from 'lucide-react';

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

// Aynı ekran üç yerde parça parça kullanılır: Kartlar sekmesi, Borçlar sekmesi ve Özet'teki düzenli gelir/giderler
// Banka adına göre kart rengi
const bankGradient = (bank: string) => {
  const b = bank.toLocaleLowerCase('tr-TR');
  if (b.includes('garanti')) return 'from-emerald-500 to-teal-700';
  if (b.includes('deniz')) return 'from-sky-500 to-blue-800';
  if (b.includes('yapı') || b.includes('yapi') || b.includes('world')) return 'from-indigo-600 to-slate-900';
  if (b.includes('iş') || b.includes('is bank') || b.includes('maximum')) return 'from-blue-600 to-indigo-900';
  if (b.includes('akbank') || b.includes('axess') || b.includes('ziraat') || b.includes('halk')) return 'from-rose-500 to-red-800';
  if (b.includes('qnb') || b.includes('finans') || b.includes('enpara')) return 'from-violet-500 to-purple-800';
  if (b.includes('vakıf') || b.includes('vakif')) return 'from-amber-500 to-orange-700';
  return 'from-slate-600 to-slate-900';
};

export type InstallmentsSection = 'cards' | 'debts' | 'recurring';

export const InstallmentsView: React.FC<{ section?: InstallmentsSection }> = ({ section = 'debts' }) => {
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
    updateCreditCard,
    recurring,
    deleteRecurring,
    transactions
  } = useBudget();
  const [recModal, setRecModal] = useState<{ open: boolean; item: RecurringItem | null }>({ open: false, item: null });
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [cardModal, setCardModal] = useState<{ open: boolean; card: CreditCardAccount | null }>({ open: false, card: null });
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementCard, setStatementCard] = useState<string | undefined>();
  const [instModal, setInstModal] = useState<{ open: boolean; inst: InstallmentDebt | null }>({ open: false, inst: null });

  const money = (tryAmount: number) => formatCurrency(convertCurrency(tryAmount, 'TRY', currency), currency);

  const activeInstallments = installments.filter(isActive);
  const monthlyLoad = activeInstallments.reduce((sum, i) => sum + currentAmount(i), 0);
  // Kira, abonelik gibi her ay tekrarlayan giderler (taksitler hariç)
  const monthlyFixed = recurring.filter((r) => r.active && r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  // Bu ay henüz ödenmemiş olanlar: "Bu ayı öde" denmemiş taksitler + günü gelmemiş (işlemi oluşmamış) düzenli giderler
  const thisMonth = monthKeyOf(new Date());
  const loadLeft = activeInstallments.filter((i) => !isInstallmentPaidThisMonth(i.id)).reduce((sum, i) => sum + currentAmount(i), 0);
  const fixedLeft = recurring
    .filter((r) => r.active && r.type === 'expense' && !r.skipMonths?.includes(thisMonth) && !transactions.some((t) => t.id === `rec-${r.id}-${thisMonth}`))
    .reduce((sum, r) => sum + r.amount, 0);
  const totalCardDebt = creditCards.reduce((sum, c) => sum + c.currentDebt, 0);
  const totalCardLimit = creditCards.reduce((sum, c) => sum + c.limit, 0);
  // Limit girilmiş kartların kullanılabilir limiti (gelecek taksitler düşülür, eksi olabilir)
  const totalAvailable = creditCards.filter((c) => c.limit > 0).reduce((sum, c) => sum + availableLimitOf(c), 0);

  const confirmDelete = (label: string, action: () => void) => {
    if (window.confirm(`"${label}" silinsin mi?`)) action();
  };

  return (
    <div className="space-y-6">
      {section === 'debts' && (
        <div className="space-y-3">
          <h2 className="sm:hidden text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>Borçlar & Taksitler</span>
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {(
              [
                ['Bu ay kalan taksit', loadLeft, `aylık ${money(monthlyLoad)}`, 'from-indigo-500 to-violet-600'],
                ['Bu ay kalan sabit gider', fixedLeft, `aylık ${money(monthlyFixed)}`, 'from-amber-400 to-orange-500'],
                ['Bu ay kalan toplam', loadLeft + fixedLeft, `ödenen ${money(Math.max(0, monthlyLoad + monthlyFixed - loadLeft - fixedLeft))}`, 'from-slate-700 to-slate-950']
              ] as const
            ).map(([label, value, sub, g]) => (
              <div key={label} className={`relative overflow-hidden p-3 sm:p-5 rounded-2xl text-white shadow-sm bg-gradient-to-br ${g} min-w-0`}>
                <div className="absolute -right-8 -bottom-10 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
                <span className="relative text-[11px] sm:text-xs font-medium text-white/85 block leading-tight">{label}</span>
                <span className="relative text-sm sm:text-2xl font-extrabold font-mono block truncate">{money(value)}</span>
                <span className="relative text-[10px] sm:text-[11px] text-white/75 block truncate">{sub}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Krediler, yapılandırmalar, Eminevim ve diğer taksitli borçlar; ödeme günleri ve bitişleri otomatik takip edilir.
          </p>
        </div>
      )}

      {section === 'cards' && (
        <div className="space-y-3">
          <div>
            <h2 className="sm:hidden text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>Kredi Kartları</span>
            </h2>
            <p className="sm:hidden text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Ekstre borcu, asgari ödeme, dönem içi harcama ve kalan limit. Yeni ekstre gelince PDF'ini yükleyin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 order-first">
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl text-white shadow-sm bg-gradient-to-br from-rose-500 to-orange-500 min-w-0">
              <div className="absolute -right-8 -bottom-10 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <span className="relative text-[11px] sm:text-xs font-medium text-white/80 block">Toplam kart borcu</span>
              <span className="relative text-lg sm:text-2xl font-extrabold font-mono block truncate">{money(totalCardDebt)}</span>
            </div>
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl text-white shadow-sm bg-gradient-to-br from-sky-500 to-indigo-600 min-w-0">
              <div className="absolute -right-8 -bottom-10 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <span className="relative text-[11px] sm:text-xs font-medium text-white/80 block">Kalan limit</span>
              <span className={`relative text-lg sm:text-2xl font-extrabold font-mono block truncate ${totalAvailable < 0 ? 'text-rose-100' : ''}`}>{money(totalAvailable)}</span>
            </div>
          </div>
        </div>
      )}

      {section === 'cards' &&
        creditCards
          .filter((c) => c.currentDebt > 0 && c.statementCheckedKey !== lastStatementKey(c))
          .map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
              <span className="text-amber-800 dark:text-amber-300">
                <b>{c.name.toLocaleLowerCase('tr-TR').includes(c.bank.toLocaleLowerCase('tr-TR')) ? c.name : `${c.bank} ${c.name}`}</b>: yeni ekstre kesildi (her ayın {c.statementDay}. günü). PDF'ini yükleyince borç ve harcamalar güncellenir.
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateCreditCard({ ...c, statementCheckedKey: lastStatementKey(c) })}
                  className="px-2.5 py-1.5 rounded-lg text-amber-800 dark:text-amber-300 font-semibold"
                >
                  Gerek yok
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatementCard(c.id);
                    setStatementOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold"
                >
                  Yükle
                </button>
              </span>
            </div>
          ))}

      {section === 'cards' && (
        <button
          type="button"
          onClick={() => {
            setStatementCard(undefined);
            setStatementOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-sky-300 dark:border-sky-800 text-sm font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
        >
          <FileText className="w-4 h-4" /> Ekstre PDF'i yükle (harcamalar + kart borcu)
        </button>
      )}

      {section === 'recurring' && <SubscriptionsCard />}

      {/* Düzenli gelir & giderler */}
      {section === 'recurring' && (
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
      )}

      {/* Kredi kartları */}
      {section === 'cards' && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Kartlarım
            {totalCardLimit > 0 && (
              <span className="ml-2 text-xs font-normal text-neutral-500">
                Limit doluluğu %{Math.round(((totalCardLimit - totalAvailable) / totalCardLimit) * 100)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {creditCards.map((card) => {
              const usage = card.limit > 0 ? Math.min(100, ((card.limit - availableLimitOf(card)) / card.limit) * 100) : 0;
              const due = nextDayOfMonth(card.dueDay);
              const stmt = statementDebtOf(card);
              const minimum = minimumPaymentOf(card);
              const period = periodSpendOf(card);
              const urgent = stmt > 0 && due.daysLeft <= 3;
              return (
                <div key={card.id} className="p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
                  <div className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${bankGradient(card.bank)} shadow-sm`}>
                    <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                    <div className="relative flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{card.bank}</span>
                        <h4 className="text-base font-bold truncate">
                          {card.name}
                          <span className="ml-1.5 text-[11px] font-medium text-white/70">· {card.member}</span>
                        </h4>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" title="Düzenle" onClick={() => setCardModal({ open: true, card })} className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/15">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" title="Sil" onClick={() => confirmDelete(card.name, () => deleteCreditCard(card.id))} className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/15">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="relative mt-5 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-white/70 block">Güncel borç</span>
                        <span className="text-2xl font-extrabold font-mono tracking-tight whitespace-nowrap">{money(card.currentDebt)}</span>
                      </div>
                      {card.limit > 0 && (
                        <div className="text-right">
                          <span className="text-[11px] text-white/70 block">Kalan limit</span>
                          <span className={`text-sm font-bold font-mono ${availableLimitOf(card) < 0 ? 'text-rose-200' : ''}`}>{money(availableLimitOf(card))}</span>
                          {(card.futureInstallments ?? 0) > 0 && (
                            <span className="text-[10px] text-white/70 block" title="Henüz ekstreye girmemiş taksitler bankada limitten düşer">
                              gelecek taksit {money(card.futureInstallments!)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {card.limit > 0 && (
                      <div className="relative mt-3">
                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${usage >= 90 ? 'bg-rose-300' : usage >= 70 ? 'bg-amber-300' : 'bg-white'}`} style={{ width: `${usage}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/70 mt-1 font-mono">
                          <span>%{Math.round(usage)} dolu</span>
                          <span>Limit {money(card.limit)}</span>
                        </div>
                        {/* Kalan limit nasıl hesaplandı: bankayla karşılaştırmak için */}
                        <p className="text-[10px] text-white/75 mt-1 font-mono leading-snug">
                          {money(card.limit)} − borç {money(card.currentDebt)}
                          {(card.futureInstallments ?? 0) > 0 ? ` − gelmemiş taksit ${money(card.futureInstallments!)}` : ''}
                          {(card.futureInstallments ?? 0) < 0 ? ` + banka farkı ${money(-card.futureInstallments!)}` : ''} = {money(availableLimitOf(card))}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="px-2 pb-2 space-y-3">

                  {card.statementTotal !== undefined && card.statementTotal > stmt && (
                    <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                      <span>Ekstre {money(card.statementTotal)}</span>
                      <span>Ödenen {money(card.statementTotal - stmt)}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40">
                      <span className="text-rose-700 dark:text-rose-300 block">Ekstreden kalan</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{money(stmt)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                      <span className="text-amber-700 dark:text-amber-300 block">Kalan asgari (%{Math.round(minimumRateOf(card) * 100)})</span>
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
                        // Kartlı harcamalar net bakiyeden düşülmediği için kart ödemesi her zaman gider olarak kaydedilir
                        payCardDebt(card.id, amount, true);
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
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* Taksitler */}
      {section === 'debts' && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {installments.map((inst) => {
              const active = isActive(inst);
              const paid = inst.paidInstallments ?? 0;
              const next = nextDayOfMonth(inst.paymentDayOfMonth || 1);
              return (
                <div
                  key={inst.id}
                  className={`p-5 rounded-2xl border bg-white dark:bg-neutral-900 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between gap-3 ${
                    active ? 'border-neutral-200 dark:border-neutral-800' : 'border-sky-200 dark:border-sky-900 opacity-70'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
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
                        <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full" style={{ width: `${Math.min(100, (paid / (totalOf(inst) || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500">Süresiz (her ay devam ediyor)</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">Aylık</span>
                      <span className="text-lg font-extrabold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
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
      )}

      {/* Bitiş takvimi */}
      {section === 'debts' && <DebtPayoffChart />}
      {section === 'debts' && <DebtPlanner />}

      <CreditCardModal isOpen={cardModal.open} editCard={cardModal.card} onClose={() => setCardModal({ open: false, card: null })} />
      <RecurringModal isOpen={recModal.open} editItem={recModal.item} onClose={() => setRecModal({ open: false, item: null })} />
      <InstallmentModal isOpen={instModal.open} editInstallment={instModal.inst} onClose={() => setInstModal({ open: false, inst: null })} />
      {statementOpen && <StatementImportModal initialCardId={statementCard} onClose={() => setStatementOpen(false)} />}
    </div>
  );
};

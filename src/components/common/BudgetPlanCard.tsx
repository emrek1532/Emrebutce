import React, { useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { budgetMonthOf, monthKeyOf } from '../../utils/budgetMonth';
import { statementDebtOf, periodSpendOf } from '../../utils/cardStatement';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { Wallet } from 'lucide-react';

const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

// "Bu ay ne kadar harcayabilirim?" — nakit akışına göre ay planı:
// beklenen gelir − (sabit giderler + taksitler + kart ekstreleri + kartsız diğer harcamalar) = serbest para
export const BudgetPlanCard: React.FC = () => {
  const { transactions, recurring, installments, creditCards, currency } = useBudget();

  const plan = useMemo(() => {
    const month = monthKeyOf(new Date());
    const thisMonth = transactions.filter((t) => budgetMonthOf(t) === month);
    const toTry = (t: { amount: number; currency: any }) => convertCurrency(t.amount, t.currency, 'TRY');
    const byCard = (creditor: string) =>
      creditCards.some((c) => norm(creditor).includes(norm(c.bank)) || norm(creditor).includes(norm(c.name)));

    // Gelir: düzenli gelirlerin tamamı (henüz yatmamış olsa da) + bu ay girilen diğer gelirler
    const recurringIncome = recurring.filter((r) => r.active && r.type === 'income').reduce((s, r) => s + r.amount, 0);
    // Elle girilmiş gelir bir düzenli gelirle aynıysa (yakın tutar) o zaten düzenli gelirde sayıldı
    const recurringIncomes = recurring.filter((r) => r.active && r.type === 'income');
    const otherIncome = thisMonth
      .filter(
        (t) =>
          t.type === 'income' &&
          !t.id.startsWith('rec-') &&
          !recurringIncomes.some((r) => Math.abs(t.amount - r.amount) <= Math.max(1, r.amount * 0.02))
      )
      .reduce((s, t) => s + toTry(t), 0);
    const income = recurringIncome + otherIncome;

    // Kartla ödenmeyen sabit giderler (kartla ödenenler ekstrenin içinde)
    const fixed = recurring
      .filter((r) => r.active && r.type === 'expense' && r.paymentMethod !== 'Kredi Kartı')
      .reduce((s, r) => s + r.amount, 0);

    // Kartla ödenmeyen aktif taksitler
    const loans = installments
      .filter((i) => {
        const total = i.schedule ? i.schedule.length : i.totalInstallments;
        return (!total || (i.remainingInstallments ?? 0) > 0 || thisMonth.some((t) => t.installmentInfo?.installmentId === i.id)) && !byCard(i.creditor);
      })
      .reduce((s, i) => {
        const paid = thisMonth.find((t) => t.installmentInfo?.installmentId === i.id);
        return s + (paid ? toTry(paid) : i.schedule ? i.schedule.find((x) => !x.paid)?.amount ?? 0 : i.monthlyAmount);
      }, 0);

    // Bu ay ödenecek kart ekstreleri (kalan) + bu ay yapılmış ekstre ödemeleri
    const cardPayments = thisMonth
      .filter((t) => t.type === 'expense' && /kart borcu ödemesi/i.test(t.description))
      .reduce((s, t) => s + toTry(t), 0);
    const cards = creditCards.reduce((s, c) => s + statementDebtOf(c), 0) + cardPayments;

    // Kartsız yapılan diğer harcamalar (düzenli, taksit ve kart ödemesi hariç)
    const spent = thisMonth
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.paymentMethod !== 'Kredi Kartı' &&
          !t.id.startsWith('rec-') &&
          !t.installmentInfo &&
          !/kart borcu ödemesi/i.test(t.description)
      )
      .reduce((s, t) => s + toTry(t), 0);
    const saved = thisMonth.filter((t) => t.type === 'saving').reduce((s, t) => s + toTry(t), 0);

    const free = income - fixed - loans - cards - spent - saved;
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
    const cardPeriod = creditCards.reduce((s, c) => s + periodSpendOf(c), 0);
    return { income, fixed, loans, cards, spent, saved, free, daily: free / daysLeft, daysLeft, cardPeriod };
  }, [transactions, recurring, installments, creditCards]);

  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);
  const positive = plan.free >= 0;
  const rows: [string, number][] = [
    ['Sabit giderler', plan.fixed],
    ['Taksitler', plan.loans],
    ['Kart ekstreleri', plan.cards],
    ['Diğer harcamalar', plan.spent],
    ...(plan.saved > 0 ? ([['Birikime ayrılan', plan.saved]] as [string, number][]) : [])
  ];

  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-sky-600" /> Bu Ay Ne Kadar Harcayabilirim?
        </h3>
        <span className="text-[11px] text-neutral-500">{plan.daysLeft} gün kaldı</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-[11px] text-neutral-500 block">Serbest kalan</span>
          <span className={`text-2xl font-bold font-mono ${positive ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {money(plan.free)}
          </span>
        </div>
        {positive && (
          <div className="text-right">
            <span className="text-[11px] text-neutral-500 block">Günlük</span>
            <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">{money(plan.daily)}</span>
          </div>
        )}
      </div>
      <div className="text-xs space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex justify-between">
          <span className="text-neutral-500">Beklenen gelir</span>
          <span className="font-mono text-sky-700 dark:text-sky-400">+{money(plan.income)}</span>
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-neutral-500">{label}</span>
            <span className="font-mono text-rose-600 dark:text-rose-400">−{money(value)}</span>
          </div>
        ))}
      </div>
      {plan.cards > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Kart ekstreleri, kartlardaki "Son ekstre borcu" toplamıdır. Bilinmiyorsa kartın tüm borcu (kalan taksitler dahil) sayılır;
          Taksitler & Borçlar'da her kartı düzenleyip bu ayki gerçek ekstre tutarını girin.
        </p>
      )}
      {plan.cardPeriod > 0 && (
        <p className="text-[11px] text-neutral-500">
          Kartla bu dönem harcanan {money(plan.cardPeriod)} bir sonraki ekstreye kalır; bu aya sayılmaz.
        </p>
      )}
    </div>
  );
};

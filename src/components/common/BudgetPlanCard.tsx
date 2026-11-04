import React, { useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { budgetMonthOf, monthKeyOf } from '../../utils/budgetMonth';
import { minimumPaymentOf, statementDebtOf, periodSpendOf } from '../../utils/cardStatement';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { ChevronDown, Wallet } from 'lucide-react';

const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

// "Bu ay ne kadar harcayabilirim?" — nakit akışına göre ay planı:
// beklenen gelir − (sabit giderler + taksitler + kart ekstreleri + kartsız diğer harcamalar) = serbest para
export const BudgetPlanCard: React.FC = () => {
  const { transactions, recurring, installments, creditCards, currency, selectedMonth, savingsGoals, familyMembers, addTransaction } = useBudget();
  const [goalId, setGoalId] = useState('');
  const [savedNow, setSavedNow] = useState(false);
  const isPast = selectedMonth !== monthKeyOf(new Date());

  const plan = useMemo(() => {
    const month = isPast ? selectedMonth : monthKeyOf(new Date());
    const thisMonth = transactions.filter((t) => budgetMonthOf(t) === month);
    const toTry = (t: { amount: number; currency: any }) => convertCurrency(t.amount, t.currency, 'TRY');
    if (isPast) {
      // Geçmiş ay: tahmin yok, yalnızca gerçekleşenler
      const sumOf = (f: (t: (typeof thisMonth)[number]) => boolean) => thisMonth.filter(f).reduce((s, t) => s + toTry(t), 0);
      const cashOut = (t: (typeof thisMonth)[number]) => t.type === 'expense' && (t.paymentMethod !== 'Kredi Kartı' || !!t.installmentInfo);
      const income = sumOf((t) => t.type === 'income');
      const fixed = sumOf((t) => cashOut(t) && t.id.startsWith('rec-'));
      const loans = sumOf((t) => cashOut(t) && !t.id.startsWith('rec-') && !!t.installmentInfo);
      const minimums = sumOf((t) => cashOut(t) && /kart borcu ödemesi/i.test(t.description));
      const spent = sumOf((t) => cashOut(t) && !t.id.startsWith('rec-') && !t.installmentInfo && !/kart borcu ödemesi/i.test(t.description));
      const saved = sumOf((t) => t.type === 'saving');
      const free = income - fixed - loans - minimums - spent - saved;
      return { income, fixed, loans, cards: minimums, spent, saved, free, daily: 0, daysLeft: 0, cardPeriod: 0, minimums };
    }
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

    // Kartlar için plana yalnızca asgari ödemeler girer: kalan asgari + bu ay yapılmış kart ödemeleri
    const minimums = creditCards.reduce((s, c) => s + minimumPaymentOf(c), 0) + cardPayments;
    const free = income - fixed - loans - minimums - spent - saved;
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
    const cardPeriod = creditCards.reduce((s, c) => s + periodSpendOf(c), 0);
    return { income, fixed, loans, cards, spent, saved, free, daily: free / daysLeft, daysLeft, cardPeriod, minimums };
  }, [transactions, recurring, installments, creditCards, isPast, selectedMonth]);

  const [open, setOpen] = useState(false);
  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);
  const positive = plan.free >= 0;
  // Gelir yattıysa serbest kalanın yaklaşık %30'u birikime önerilir (500 ₺'ye yuvarlanır)
  const incomeArrived = !isPast && transactions.some((t) => t.type === 'income' && budgetMonthOf(t) === monthKeyOf(new Date()));
  const suggestion = Math.floor((plan.free * 0.3) / 500) * 500;
  const showSuggestion = incomeArrived && suggestion >= 500 && plan.saved === 0 && !savedNow;
  const saveSuggestion = () => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    addTransaction({
      type: 'saving',
      amount: suggestion,
      currency: 'TRY',
      category: 'Birikim',
      member: familyMembers[0]?.name || 'Ortak',
      date: new Date().toISOString().slice(0, 10),
      description: goal ? `${goal.title} birikimi` : 'Aylık birikim',
      paymentMethod: 'Havale/EFT',
      isRecurring: false,
      goalId: goal?.id
    });
    setSavedNow(true);
  };
  const rows: [string, number][] = [
    ['Sabit giderler', plan.fixed],
    ['Taksitler', plan.loans],
    [isPast ? 'Kart ödemeleri' : 'Kart asgari ödemeleri', plan.minimums],
    ['Diğer harcamalar', plan.spent],
    ...(plan.saved > 0 ? ([['Birikime ayrılan', plan.saved]] as [string, number][]) : [])
  ];

  return (
    <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-sky-600" /> {isPast ? 'Ay sonucu' : 'Bu ay harcayabileceğin'}
        </h3>
        {!isPast && <span className="text-[11px] text-neutral-500">{plan.daysLeft} gün kaldı</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-[11px] text-neutral-500 block">{isPast ? 'Aydan artan' : 'Serbest kalan'}</span>
          <span className={`text-3xl font-extrabold font-mono tracking-tight ${positive ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {money(plan.free)}
          </span>
        </div>
        {positive && !isPast && (
          <div className="text-right">
            <span className="text-[11px] text-neutral-500 block">Günlük</span>
            <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">{money(plan.daily)}</span>
          </div>
        )}
      </div>
      {plan.income > 0 && (
        <div>
          <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex">
            {(
              [
                [plan.fixed, 'bg-amber-400'],
                [plan.loans, 'bg-indigo-400'],
                [plan.minimums, 'bg-rose-400'],
                [plan.spent + plan.saved, 'bg-sky-300']
              ] as [number, string][]
            ).map(([v, c], i) => (
              <div key={i} className={c} style={{ width: `${Math.min(100, (v / plan.income) * 100)}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-400" />Sabit</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-indigo-400" />Taksit</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-rose-400" />Kart</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-sky-300" />Diğer</span>
            <span className="ml-auto">Gelirin %{Math.max(0, Math.round((1 - plan.free / plan.income) * 100))}'i ayrıldı</span>
          </div>
        </div>
      )}
      {showSuggestion && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            Gelir yattı. Bu ay <b className="font-mono">{money(suggestion)}</b> birikime ayırabilirsin (serbest kalanın ~%30'u).
          </p>
          <div className="flex gap-2">
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="flex-1 min-w-0 text-xs py-1.5 px-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-neutral-800"
            >
              <option value="">Genel birikim</option>
              {savingsGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={saveSuggestion} className="px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white">
              Ayır
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500"
      >
        Nasıl hesaplandı?
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
      <>
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-neutral-500">{isPast ? 'Gelir' : 'Beklenen gelir'}</span>
          <span className="font-mono text-sky-700 dark:text-sky-400">+{money(plan.income)}</span>
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-neutral-500">{label}</span>
            <span className="font-mono text-rose-600 dark:text-rose-400">−{money(value)}</span>
          </div>
        ))}
      </div>
      {!isPast && plan.cards > plan.minimums && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Kartlara yalnızca asgari ödemeler sayıldı. Ekstrelerin tamamını öderseniz {money(plan.cards - plan.minimums)} daha gider; kalan ekstre
          sonraki aya faizle devreder.
        </p>
      )}
      {plan.cardPeriod > 0 && (
        <p className="text-[11px] text-neutral-500">
          Kartla bu dönem harcanan {money(plan.cardPeriod)} bir sonraki ekstreye kalır; bu aya sayılmaz.
        </p>
      )}
      </>
      )}
    </div>
  );
};

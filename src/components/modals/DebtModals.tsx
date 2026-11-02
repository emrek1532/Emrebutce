import React, { useEffect, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { lastStatementKey } from '../../utils/cardStatement';
import { CARRY_DEFAULT_FROM_DAY } from '../../utils/budgetMonth';
import { CreditCardAccount, InstallmentDebt, PaymentMethod, RecurringItem, TransactionType } from '../../types/budget';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/initialData';
import { X } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500';
const labelClass = 'block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1';

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
    <div className="w-full sm:max-w-lg bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalFooter: React.FC<{ onClose: () => void; submitLabel: string }> = ({ onClose, submitLabel }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
    >
      Vazgeç
    </button>
    <button
      type="submit"
      className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
    >
      {submitLabel}
    </button>
  </div>
);

// "1.500,50", "1.500", "1500.5" ve "1500" biçimlerini okur
const toNumber = (v: string) => {
  const s = v.trim().replace(/\s/g, '');
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  return Number(s);
};
const clampDay = (v: string) => Math.min(31, Math.max(1, Math.round(Number(v) || 1)));

// --- Kredi kartı ---

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editCard?: CreditCardAccount | null;
}

export const CreditCardModal: React.FC<CardModalProps> = ({ isOpen, onClose, editCard }) => {
  const { addCreditCard, updateCreditCard, familyMembers } = useBudget();
  const [bank, setBank] = useState('');
  const [name, setName] = useState('');
  const [member, setMember] = useState('');
  const [limit, setLimit] = useState('');
  const [currentDebt, setCurrentDebt] = useState('');
  const [statementDebt, setStatementDebt] = useState('');
  const [statementDay, setStatementDay] = useState('1');
  const [dueDay, setDueDay] = useState('10');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBank(editCard?.bank ?? '');
    setName(editCard?.name ?? '');
    setMember(editCard?.member ?? familyMembers[0]?.name ?? 'Ortak');
    setLimit(editCard ? String(editCard.limit) : '');
    setCurrentDebt(editCard ? String(editCard.currentDebt) : '');
    setStatementDebt(editCard ? String(editCard.statementDebt ?? editCard.currentDebt) : '');
    setStatementDay(String(editCard?.statementDay ?? 1));
    setDueDay(String(editCard?.dueDay ?? 10));
    setNotes(editCard?.notes ?? '');
  }, [isOpen, editCard, familyMembers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const card = {
      bank: bank.trim(),
      name: name.trim() || bank.trim(),
      member,
      limit: toNumber(limit) || 0,
      currentDebt: toNumber(currentDebt) || 0,
      // Boş bırakılırsa ekstre borcu güncel borç kabul edilir
      statementDebt: statementDebt.trim() ? Math.min(toNumber(statementDebt) || 0, toNumber(currentDebt) || 0) : toNumber(currentDebt) || 0,
      statementKey: editCard?.statementKey ?? lastStatementKey({ statementDay: clampDay(statementDay) }),
      statementTotal: undefined as number | undefined,
      statementDay: clampDay(statementDay),
      dueDay: clampDay(dueDay),
      notes: notes.trim() || undefined
    };
    if (!card.bank) {
      alert('Lütfen bankayı yazın.');
      return;
    }
    // Ekstre borcu elle değiştiyse asgari hesabı yeni tutardan başlar
    card.statementTotal =
      editCard && editCard.statementDebt === card.statementDebt ? editCard.statementTotal ?? card.statementDebt : card.statementDebt;
    if (editCard) updateCreditCard({ ...editCard, ...card });
    else addCreditCard(card);
    onClose();
  };

  return (
    <ModalShell title={editCard ? 'Kartı Düzenle' : 'Kredi Kartı Ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Banka *</label>
            <input className={inputClass} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Örn: İş Bankası" required />
          </div>
          <div>
            <label className={labelClass}>Kart adı</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Maximum" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kart limiti (₺)</label>
            <input className={inputClass} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Güncel toplam borç (₺)</label>
            <input className={inputClass} inputMode="decimal" value={currentDebt} onChange={(e) => setCurrentDebt(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Son ekstre borcu (₺) — son ödeme gününe kadar ödenecek</label>
          <input className={inputClass} inputMode="decimal" value={statementDebt} onChange={(e) => setStatementDebt(e.target.value)} placeholder="Boşsa güncel borç" />
          <p className="mt-1 text-[11px] text-neutral-500">Kesim günü gelince güncel borç kendiliğinden yeni ekstre borcu olur.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Ekstre kesim günü</label>
            <input className={inputClass} type="number" min={1} max={31} value={statementDay} onChange={(e) => setStatementDay(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Son ödeme günü</label>
            <input className={inputClass} type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Kart sahibi</label>
          <select className={inputClass} value={member} onChange={(e) => setMember(e.target.value)}>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
            <option value="Ortak">Ortak</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Not</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı" />
        </div>
        <ModalFooter onClose={onClose} submitLabel={editCard ? 'Kaydet' : 'Kartı Ekle'} />
      </form>
    </ModalShell>
  );
};

// --- Taksit / kredi ---

function addMonths(isoDate: string, months: number, day: number): string {
  const [y, m] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

function firstOfThisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editInstallment?: InstallmentDebt | null;
}

export const InstallmentModal: React.FC<InstallmentModalProps> = ({ isOpen, onClose, editInstallment }) => {
  const { addInstallment, updateInstallment, familyMembers, creditCards } = useBudget();
  const [title, setTitle] = useState('');
  const [creditor, setCreditor] = useState('');
  const [member, setMember] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [paidInstallments, setPaidInstallments] = useState('0');
  const [paymentDay, setPaymentDay] = useState('10');
  const [startDate, setStartDate] = useState(firstOfThisMonth());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(editInstallment?.title ?? '');
    setCreditor(editInstallment?.creditor ?? '');
    setMember(editInstallment?.member ?? familyMembers[0]?.name ?? 'Ortak');
    setMonthlyAmount(editInstallment ? String(editInstallment.monthlyAmount) : '');
    setTotalInstallments(editInstallment?.totalInstallments ? String(editInstallment.totalInstallments) : '');
    setPaidInstallments(String(editInstallment?.paidInstallments ?? 0));
    setPaymentDay(String(editInstallment?.paymentDayOfMonth ?? 10));
    setStartDate(editInstallment?.startDate ?? firstOfThisMonth());
    setNotes(editInstallment?.notes ?? '');
  }, [isOpen, editInstallment, familyMembers]);

  if (!isOpen) return null;

  const creditorOptions = Array.from(
    new Set(creditCards.map((c) => (c.name && c.name !== c.bank ? `${c.bank} ${c.name}` : c.bank)))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = toNumber(monthlyAmount);
    if (!title.trim() || (!(amount > 0) && !editInstallment?.schedule)) {
      alert('Lütfen ad ve geçerli bir aylık tutar girin.');
      return;
    }
    const total = Math.max(0, Math.round(Number(totalInstallments) || 0)) || undefined;
    const paid = Math.max(0, Math.round(Number(paidInstallments) || 0));
    const day = clampDay(paymentDay);
    const inst: Omit<InstallmentDebt, 'id'> = {
      title: title.trim(),
      creditor: creditor.trim() || 'Diğer',
      member,
      monthlyAmount: amount,
      totalInstallments: total,
      paidInstallments: total ? Math.min(paid, total) : paid,
      remainingInstallments: total ? Math.max(0, total - paid) : undefined,
      paymentDayOfMonth: day,
      startDate,
      endDate: total ? addMonths(startDate, total - 1, day) : '',
      category: 'Borç & Kredi',
      notes: notes.trim() || undefined
    };
    if (editInstallment?.schedule) {
      // Değişken ödeme planında tutarlar ve dönemler plandan gelir; yalnızca bilgileri güncelle
      updateInstallment({
        ...editInstallment,
        title: inst.title,
        creditor: inst.creditor,
        member: inst.member,
        paymentDayOfMonth: inst.paymentDayOfMonth,
        notes: inst.notes
      });
    } else if (editInstallment) updateInstallment({ ...editInstallment, ...inst });
    else addInstallment(inst);
    onClose();
  };

  return (
    <ModalShell title={editInstallment ? 'Taksiti Düzenle' : 'Taksit / Kredi Ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
        <div>
          <label className={labelClass}>Ne için? *</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Buzdolabı, İhtiyaç kredisi" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kart / Banka</label>
            <input
              className={inputClass}
              list="installment-creditors"
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              placeholder="Örn: İş Bankası"
            />
            <datalist id="installment-creditors">
              {creditorOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Aylık tutar (₺) *</label>
            <input className={inputClass} inputMode="decimal" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0" required />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Toplam taksit</label>
            <input className={inputClass} type="number" min={0} value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} placeholder="12" />
          </div>
          <div>
            <label className={labelClass}>Ödenen</label>
            <input className={inputClass} type="number" min={0} value={paidInstallments} onChange={(e) => setPaidInstallments(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Ödeme günü</label>
            <input className={inputClass} type="number" min={1} max={31} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>İlk taksit ayı</label>
            <input className={inputClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Kimin</label>
            <select className={inputClass} value={member} onChange={(e) => setMember(e.target.value)}>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
              <option value="Ortak">Ortak</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Not</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı" />
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Toplam taksit boş bırakılırsa süresiz (her ay devam eden) ödeme olarak kaydedilir.
        </p>
        <ModalFooter onClose={onClose} submitLabel={editInstallment ? 'Kaydet' : 'Taksiti Ekle'} />
      </form>
    </ModalShell>
  );
};

// --- Düzenli gelir / gider ---

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: RecurringItem | null;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({ isOpen, onClose, editItem }) => {
  const { addRecurring, updateRecurring, familyMembers, creditCards } = useBudget();
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [member, setMember] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Havale/EFT');
  const [active, setActive] = useState(true);
  const [cardId, setCardId] = useState('');
  const [countForNextMonth, setCountForNextMonth] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setType(editItem?.type ?? 'expense');
    setTitle(editItem?.title ?? '');
    setAmount(editItem ? String(editItem.amount) : '');
    setCategory(editItem?.category ?? EXPENSE_CATEGORIES[0]);
    setMember(editItem?.member ?? familyMembers[0]?.name ?? 'Ortak');
    setDayOfMonth(String(editItem?.dayOfMonth ?? 1));
    setPaymentMethod(editItem?.paymentMethod ?? 'Havale/EFT');
    setActive(editItem?.active ?? true);
    setCardId(editItem?.cardId ?? '');
    setCountForNextMonth(editItem?.countForNextMonth ?? false);
  }, [isOpen, editItem, familyMembers]);

  if (!isOpen) return null;

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = toNumber(amount);
    if (!title.trim() || !(value > 0)) {
      alert('Lütfen ad ve geçerli bir tutar girin.');
      return;
    }
    const item = {
      title: title.trim(),
      type,
      amount: value,
      category,
      member,
      dayOfMonth: clampDay(dayOfMonth),
      paymentMethod,
      active,
      cardId: type === 'expense' && paymentMethod === 'Kredi Kartı' && cardId ? cardId : undefined,
      countForNextMonth: type === 'income' ? countForNextMonth : undefined
    };
    if (editItem) updateRecurring({ ...editItem, ...item });
    else addRecurring(item);
    onClose();
  };

  return (
    <ModalShell title={editItem ? 'Düzenli Kalemi Düzenle' : 'Düzenli Gelir / Gider Ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategory(t === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
              }}
              className={`py-2 text-xs font-semibold rounded-lg ${
                type === t ? (t === 'income' ? 'bg-sky-600 text-white' : 'bg-rose-500 text-white') : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {t === 'income' ? 'Gelir (Maaş vb.)' : 'Gider (Kira vb.)'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Ad *</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Maaş, Kira" required />
          </div>
          <div>
            <label className={labelClass}>Tutar (₺) *</label>
            <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kategori</label>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Her ayın kaçı?</label>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => {
                setDayOfMonth(e.target.value);
                if (!editItem && type === 'income') setCountForNextMonth(Number(e.target.value) >= CARRY_DEFAULT_FROM_DAY);
              }}
            />
          </div>
        </div>
        {type === 'income' && (
          <label className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" className="mt-0.5" checked={countForNextMonth} onChange={(e) => setCountForNextMonth(e.target.checked)} />
            <span>
              <b>Sonraki ayın bütçesine say</b> — ay sonunda yatan maaş için (ör. 30 Ekim'de yatan maaş Kasım bütçesine girer).
            </span>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Kimin</label>
            <select className={inputClass} value={member} onChange={(e) => setMember(e.target.value)}>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
              <option value="Ortak">Ortak</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Ödeme yöntemi</label>
            <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {(['Havale/EFT', 'Nakit', 'Kredi Kartı', 'Banka Kartı'] as PaymentMethod[]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        {type === 'expense' && paymentMethod === 'Kredi Kartı' && creditCards.length > 0 && (
          <div>
            <label className={labelClass}>Hangi kart? (her ay borcuna eklenir)</label>
            <select className={inputClass} value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Kart belirtme</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4" />
          Aktif (günü gelince kendiliğinden işlem olarak eklensin)
        </label>
        <ModalFooter onClose={onClose} submitLabel={editItem ? 'Kaydet' : 'Ekle'} />
      </form>
    </ModalShell>
  );
};

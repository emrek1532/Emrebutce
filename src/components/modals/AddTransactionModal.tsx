import React, { useEffect, useRef, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Currency, PaymentMethod, Transaction, TransactionType } from '../../types/budget';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVING_CATEGORIES } from '../../data/initialData';
import { X, PlusCircle, ArrowDownCircle, ArrowUpCircle, Mic, Square, PiggyBank, MessageSquareText } from 'lucide-react';
import { parseBankSms } from '../../utils/smsParser';
import { guessExpenseCategory } from '../../utils/voiceTransaction';
import { learnedCategory } from '../../utils/categoryMemory';
import { isVoiceSupported, listenOnce, parseVoiceTransaction, VoiceSession } from '../../utils/voiceTransaction';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
  // Pencere açılır açılmaz dinlemeye başla (mikrofon kısayolu)
  startWithVoice?: boolean;
  // Paylaşılan SMS gibi dışarıdan gelen hazır alanlar (yeni işlemde)
  prefill?: Partial<Pick<Transaction, 'type' | 'amount' | 'description' | 'date' | 'paymentMethod' | 'cardId'>> | null;
}

const numAmountPreview = (text: string, n: number) => {
  const s = text.trim();
  const v = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return v > 0 ? (v / n).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '…';
};

export const AddTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editTransaction,
  startWithVoice,
  prefill
}) => {
  const { addTransaction, updateTransaction, familyMembers, savingsGoals, creditCards, transactions, currency: activeCurrency } = useBudget();
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [smsNote, setSmsNote] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense');
  const [amount, setAmount] = useState<string>(editTransaction ? String(editTransaction.amount) : '');
  const [currency, setCurrency] = useState<Currency>(editTransaction?.currency || activeCurrency);
  const [category, setCategory] = useState<string>(
    editTransaction?.category || (type === 'expense' ? 'Diğer Harcamalar' : INCOME_CATEGORIES[0])
  );
  const [member, setMember] = useState<string>(
    editTransaction?.member || (familyMembers[0]?.name || 'Ortak')
  );
  const [date, setDate] = useState<string>(
    editTransaction?.date || new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState<string>(editTransaction?.description || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editTransaction?.paymentMethod || 'Kredi Kartı'
  );
  const [isRecurring, setIsRecurring] = useState<boolean>(editTransaction?.isRecurring || false);
  const [goalId, setGoalId] = useState<string>(editTransaction?.goalId || '');
  const [cardId, setCardId] = useState<string>(editTransaction?.cardId || '');
  // Kartla taksitli alışveriş: tutar TOPLAM fiyattır (banka da limitten tamamını düşer); ekstrede gelen aylık taksitler bununla eşleşir
  const [cardInstallments, setCardInstallments] = useState(1);

  const categoriesFor = (t: TransactionType) =>
    t === 'income' ? INCOME_CATEGORIES : t === 'saving' ? SAVING_CATEGORIES : EXPENSE_CATEGORIES;
  // Varsayılan kategori: giderde "Diğer Harcamalar" (listenin ilki "Konut & Kira" fark edilmeden seçili kalıyordu);
  // açıklama yazılınca uygun kategori kendiliğinden önerilir
  const defaultCategory = (t: TransactionType) => (t === 'expense' ? 'Diğer Harcamalar' : categoriesFor(t)[0]);

  // Pencere her açıldığında alanları düzenlenen işleme (ya da boş forma) göre doldur
  useEffect(() => {
    if (!isOpen) return;
    const t = editTransaction?.type || 'expense';
    setType(t);
    setAmount(editTransaction ? String(editTransaction.amount) : '');
    setCurrency(editTransaction?.currency || activeCurrency);
    setCategory(editTransaction?.category || defaultCategory(t));
    setMember(editTransaction?.member || familyMembers[0]?.name || 'Ortak');
    setDate(editTransaction?.date || new Date().toISOString().split('T')[0]);
    setDescription(editTransaction?.description || '');
    setPaymentMethod(editTransaction?.paymentMethod || 'Kredi Kartı');
    setIsRecurring(editTransaction?.isRecurring || false);
    setGoalId(editTransaction?.goalId || '');
    // Yeni harcamada en son kartla girilen harcamanın kartı seçili gelir (yoksa ilk kart)
    const lastCardId = [...transactions]
      .filter((t) => t.cardId && creditCards.some((c) => c.id === t.cardId))
      .sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date))[0]?.cardId;
    setCardId(editTransaction ? editTransaction.cardId || '' : lastCardId || creditCards[0]?.id || '');
    setCategoryTouched(!!editTransaction);
    setCardInstallments(editTransaction?.installmentInfo && !editTransaction.installmentInfo.installmentId ? editTransaction.installmentInfo.total : 1);
    setSmsOpen(false);
    setSmsText('');
    setSmsNote(null);
    if (!editTransaction && prefill) applyDraft(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editTransaction, prefill]);

  // Açıklamaya göre geçmişten kategori öner (kullanıcı kategoriyi elle seçmediyse)
  const suggestCategory = (desc: string, t: TransactionType) => {
    const learned = learnedCategory(desc, transactions, t, categoriesFor(t));
    if (learned) setCategory(learned);
    // Geçmişte yoksa açıklamadaki kelimelerden tahmin (ör. "mont" → Giyim, "benzin" → Ulaşım)
    else if (t === 'expense' && desc.trim()) {
      const guess = guessExpenseCategory(desc);
      if (EXPENSE_CATEGORIES.includes(guess)) setCategory(guess);
    }
  };

  const applyDraft = (d: NonNullable<Props['prefill']>) => {
    const t = d.type || 'expense';
    setType(t);
    setCategory(defaultCategory(t));
    setCategoryTouched(false);
    if (d.amount != null) setAmount(String(d.amount));
    if (d.date) setDate(d.date);
    if (d.description) {
      setDescription(d.description);
      suggestCategory(d.description, t);
    }
    if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
    if (d.cardId) setCardId(d.cardId);
  };

  const fillFromSms = (text: string) => {
    const d = parseBankSms(text, creditCards);
    applyDraft({
      type: d.type,
      amount: d.amount ?? undefined,
      description: d.description,
      date: d.date,
      paymentMethod: d.type === 'expense' ? (d.isCard ? 'Kredi Kartı' : 'Havale/EFT') : undefined,
      cardId: d.cardId
    });
    setSmsNote(d.amount === null ? 'Tutar bulunamadı, elle girin.' : 'SMS okundu — kontrol edip kaydedin.');
    setSmsOpen(false);
  };

  const selectType = (t: TransactionType) => {
    setType(t);
    setCategory(defaultCategory(t));
  };

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceSessionRef = useRef<VoiceSession | null>(null);

  const startVoice = () => {
    if (isListening) {
      voiceSessionRef.current?.stop();
      return;
    }
    setVoiceError(null);
    setVoiceText(null);
    setIsListening(true);
    voiceSessionRef.current = listenOnce(
      (text) => {
        setVoiceText(text);
        const draft = parseVoiceTransaction(text, familyMembers.map((m) => m.name));
        setType(draft.type);
        setCategory(draft.category);
        if (draft.amount !== null) setAmount(String(draft.amount));
        if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
        if (draft.member) setMember(draft.member);
        setDate(draft.date);
        setDescription(draft.description);
        if (draft.amount === null) setVoiceError('Tutar anlaşılamadı, lütfen tutarı elle girin.');
      },
      (message) => setVoiceError(message),
      () => setIsListening(false)
    );
  };

  useEffect(() => {
    if (isOpen && startWithVoice && !editTransaction) startVoice();
    if (!isOpen) {
      voiceSessionRef.current?.stop();
      setVoiceText(null);
      setVoiceError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, startWithVoice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Lütfen geçerli bir tutar giriniz.');
      return;
    }

    if (!description.trim()) {
      alert('Lütfen bir açıklama giriniz.');
      return;
    }

    if (editTransaction) {
      updateTransaction({
        ...editTransaction,
        type,
        amount: numAmount,
        currency,
        category,
        member,
        date,
        description: description.trim(),
        paymentMethod: type === 'expense' ? paymentMethod : 'Havale/EFT',
        isRecurring,
        goalId: type === 'saving' && goalId ? goalId : undefined,
        cardId: type === 'expense' && paymentMethod === 'Kredi Kartı' && cardId ? cardId : undefined,
        installmentInfo:
          type === 'expense' && paymentMethod === 'Kredi Kartı' && cardInstallments > 1
            ? { current: 1, total: cardInstallments }
            : editTransaction?.installmentInfo?.installmentId
            ? editTransaction.installmentInfo
            : undefined
      });
    } else {
      addTransaction({
        type,
        amount: numAmount,
        currency,
        category,
        member,
        date,
        description: description.trim(),
        paymentMethod: type === 'expense' ? paymentMethod : 'Havale/EFT',
        isRecurring,
        goalId: type === 'saving' && goalId ? goalId : undefined,
        cardId: type === 'expense' && paymentMethod === 'Kredi Kartı' && cardId ? cardId : undefined,
        installmentInfo:
          type === 'expense' && paymentMethod === 'Kredi Kartı' && cardInstallments > 1
            ? { current: 1, total: cardInstallments }
            : undefined
      });
    }

    onClose();
  };

  const currentCategoryList = categoriesFor(type);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {editTransaction ? 'İşlemi Düzenle' : 'Yeni İşlem Kaydı'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Banka SMS'inden doldur */}
          {!editTransaction && (
            <div className="space-y-2">
              {!smsOpen ? (
                <button
                  type="button"
                  onClick={() => setSmsOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-dashed border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                >
                  <MessageSquareText className="w-4 h-4" /> Banka SMS'inden doldur
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Bankadan gelen harcama SMS'ini buraya yapıştırın"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSmsOpen(false)} className="flex-1 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700">
                      Vazgeç
                    </button>
                    <button type="button" disabled={!smsText.trim()} onClick={() => fillFromSms(smsText)} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white disabled:opacity-50">
                      Doldur
                    </button>
                  </div>
                </div>
              )}
              {smsNote && <p className="text-[11px] text-center text-sky-700 dark:text-sky-300">{smsNote}</p>}
            </div>
          )}

          {/* Sesli giriş */}
          {isVoiceSupported() && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={startVoice}
                className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                }`}
              >
                {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListening ? 'Dinliyorum… (durdurmak için dokunun)' : 'Sesle Doldur'}</span>
              </button>
              {!voiceText && !voiceError && !isListening && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center">
                  Örn: "Markette 250 lira harcadım", "Maaş yattı 45 bin lira", "Dün benzine 2 bin lira nakit"
                </p>
              )}
              {voiceText && (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 text-center">
                  Duyulan: <strong>"{voiceText}"</strong> — kontrol edip kaydedin.
                </p>
              )}
              {voiceError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 text-center">{voiceError}</p>
              )}
            </div>
          )}

          {/* Tür: Gider / Gelir / Birikim */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
            {([
              ['expense', 'Gider', ArrowDownCircle, 'bg-rose-500'],
              ['income', 'Gelir', ArrowUpCircle, 'bg-sky-600'],
              ['saving', 'Birikim', PiggyBank, 'bg-amber-500']
            ] as const).map(([t, label, Icon, active]) => (
              <button
                key={t}
                type="button"
                onClick={() => selectType(t)}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  type === t
                    ? `${active} text-white shadow-xs`
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {type === 'saving' && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Hangi hedefe? (isteğe bağlı)
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Genel birikim (hedefe bağlı değil)</option>
                {savingsGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tutar *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-base font-mono font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Para Birimi
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Açıklama *
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Haftalık market alışverişi, Kira vb."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) => !categoryTouched && !editTransaction && suggestCategory(e.target.value, type)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Category & Member */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCategoryTouched(true);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {currentCategoryList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Aile Üyesi
              </label>
              <select
                value={member}
                onChange={(e) => setMember(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                İşlem Tarihi
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {type === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ödeme Yöntemi
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Banka Kartı">Banka Kartı</option>
                <option value="Nakit">Nakit</option>
                <option value="Havale/EFT">Havale / EFT</option>
              </select>
            </div>
            )}
          </div>

          {type === 'expense' && !editTransaction && /kart.*(borc|borç|ödeme|odeme)|ekstre/i.test(description) && (
            <p className="text-[11px] rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-2">
              Kart borcunu ödediysen buradan değil, <b>Kartlar → ilgili kart → Borç Öde</b> ile gir. Böylece kartın borcu da düşer ve harcama iki
              kez sayılmaz.
            </p>
          )}

          {type === 'expense' && paymentMethod === 'Kredi Kartı' && creditCards.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Hangi kart? (borcu bu karta eklenir)
              </label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bank} {c.name}
                  </option>
                ))}
                <option value="">Kart belirtme (borca ekleme)</option>
              </select>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Taksit</label>
                <select
                  value={cardInstallments}
                  onChange={(e) => setCardInstallments(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value={1}>Peşin</option>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>
                      {n} taksit
                    </option>
                  ))}
                </select>
              </div>
              {cardInstallments > 1 && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  Tutara <b>toplam fiyatı</b> yazın (aylık taksiti değil). Banka da limitten tamamını düşer; aylık{' '}
                  {numAmountPreview(amount, cardInstallments)} ₺ ekstrelere gelir, ekstre yüklenince tekrar eklenmez.
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700 rounded-lg transition-colors"
            >
              {editTransaction ? 'Değişiklikleri Kaydet' : 'İşlemi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

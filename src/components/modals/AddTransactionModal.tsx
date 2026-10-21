import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Currency, PaymentMethod, Transaction, TransactionType } from '../../types/budget';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/initialData';
import { X, PlusCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export const AddTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editTransaction
}) => {
  const { addTransaction, updateTransaction, familyMembers, currency: activeCurrency } = useBudget();

  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense');
  const [amount, setAmount] = useState<string>(editTransaction ? String(editTransaction.amount) : '');
  const [currency, setCurrency] = useState<Currency>(editTransaction?.currency || activeCurrency);
  const [category, setCategory] = useState<string>(
    editTransaction?.category || (type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
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
        paymentMethod,
        isRecurring
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
        paymentMethod,
        isRecurring
      });
    }

    onClose();
  };

  const currentCategoryList = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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
          {/* Type Toggle: Gider / Gelir */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory(EXPENSE_CATEGORIES[0]);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>Gider (Harcama)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory(INCOME_CATEGORIES[0]);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Gelir (Maaş / Ek Gelir)</span>
            </button>
          </div>

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
                className="w-full px-3 py-2 text-base font-mono font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Para Birimi
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ödeme Yöntemi
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Banka Kartı">Banka Kartı</option>
                <option value="Nakit">Nakit</option>
                <option value="Havale/EFT">Havale / EFT</option>
              </select>
            </div>
          </div>

          {/* Recurring check */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="recurringCheck"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="recurringCheck" className="text-xs text-neutral-700 dark:text-neutral-300 select-none">
              Aylık Düzenli Tekrarlanan İşlem (Maaş, Kira, Fatura vb.)
            </label>
          </div>

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
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg transition-colors"
            >
              {editTransaction ? 'Değişiklikleri Kaydet' : 'İşlemi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

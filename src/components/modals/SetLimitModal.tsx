import React, { useState, useEffect } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CategoryLimit, Currency } from '../../types/budget';
import { EXPENSE_CATEGORIES } from '../../data/initialData';
import { X, Sliders, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editLimit?: CategoryLimit | null;
}

const PRESET_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4'];

export const SetLimitModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editLimit
}) => {
  const { categoryLimits, updateCategoryLimit, addCategoryLimit, currency: activeCurrency } = useBudget();

  const [category, setCategory] = useState(editLimit?.category || EXPENSE_CATEGORIES[0]);
  const [monthlyLimit, setMonthlyLimit] = useState(editLimit ? String(editLimit.monthlyLimit) : '5000');
  const [currency, setCurrency] = useState<Currency>(editLimit?.currency || activeCurrency);
  const [alertThresholdPercent, setAlertThresholdPercent] = useState(
    editLimit ? editLimit.alertThresholdPercent : 80
  );
  const [color, setColor] = useState(editLimit?.color || PRESET_COLORS[0]);

  useEffect(() => {
    if (editLimit) {
      setCategory(editLimit.category);
      setMonthlyLimit(String(editLimit.monthlyLimit));
      setCurrency(editLimit.currency);
      setAlertThresholdPercent(editLimit.alertThresholdPercent);
      setColor(editLimit.color);
    }
  }, [editLimit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(monthlyLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      alert('Lütfen geçerli bir limit tutarı giriniz.');
      return;
    }

    if (editLimit) {
      updateCategoryLimit({
        ...editLimit,
        category,
        monthlyLimit: limitNum,
        currency,
        alertThresholdPercent,
        color
      });
    } else {
      // Check if limit for this category already exists
      const existing = categoryLimits.find((l) => l.category === category);
      if (existing) {
        updateCategoryLimit({
          ...existing,
          monthlyLimit: limitNum,
          currency,
          alertThresholdPercent,
          color
        });
      } else {
        addCategoryLimit({
          category,
          monthlyLimit: limitNum,
          currency,
          color,
          iconName: 'ShoppingCart',
          alertThresholdPercent
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {editLimit ? `${editLimit.category} Limitini Ayarla` : 'Yeni Harcama Limiti Belirle'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Aylık Azami Bütçe Limiti *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="10000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-full px-3 py-2 text-base font-mono font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Para Birimi
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>

          {/* Threshold slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Erken Uyarı Bildirimi Eşiği</span>
              </label>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                %{alertThresholdPercent}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={alertThresholdPercent}
              onChange={(e) => setAlertThresholdPercent(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Bu kategoride harcama bütçenin %{alertThresholdPercent}'ine ulaştığında anında bildirim gönderilir. %100'ü geçtiğinde ise kritik limit aşımı uyarısı verilir.
            </p>
          </div>

          {/* Color theme */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Kategori Rengi
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-neutral-400' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

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
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 rounded-lg transition-colors"
            >
              Limiti Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

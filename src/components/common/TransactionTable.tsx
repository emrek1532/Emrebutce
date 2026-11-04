import { txTone } from '../../utils/txStyle';
import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Transaction } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import {
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  Repeat,
  CreditCard,
  Banknote,
  Building
} from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  compact?: boolean;
}

export const TransactionTable: React.FC<Props> = ({
  transactions,
  onEdit,
  compact = false
}) => {
  const { deleteTransaction, currency } = useBudget();

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Kayıtlı harcama veya gelir bulunamadı.
        </p>
        <span className="text-xs text-neutral-400 mt-1 block">
          Yukarıdaki filtreleri değiştirebilir veya yeni işlem ekleyebilirsiniz.
        </span>
      </div>
    );
  }

  // Telefonda tablo yerine dokunulabilir satırlar (dokununca düzenle)
  if (compact) {
    return (
      <ul className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xs border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
        {transactions.map((tx) => {
          const tone = txTone(tx.type);
          return (
            <li key={tx.id} className="flex items-center gap-2.5 px-3 py-2.5 active:bg-neutral-50 dark:active:bg-neutral-800" onClick={() => onEdit(tx)}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone.badge}`}>
                {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate flex items-center gap-1">
                  <span className="truncate">{tx.description}</span>
                  {tx.isRecurring && <Repeat className="w-3 h-3 text-neutral-400 shrink-0" />}
                </p>
                <span className="text-[10px] text-neutral-400 block truncate">
                  {tx.date.split('-').reverse().slice(0, 2).join('.')} · {tx.category}
                  {tx.type === 'expense' ? ` · ${tx.paymentMethod}` : ''}
                </span>
              </div>
              <span className={`text-xs font-bold font-mono shrink-0 ${tone.text}`}>
                {tone.sign}
                {formatCurrency(convertCurrency(tx.amount, tx.currency, currency), currency)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${tx.description}" işlemini silmek istediğinize emin misiniz?`)) deleteTransaction(tx.id);
                }}
                className="p-1.5 -mr-1 rounded text-neutral-300 hover:text-rose-600"
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider text-[10px] font-semibold">
            <tr>
              <th className="py-3 px-4">Tarih</th>
              <th className="py-3 px-4">Açıklama</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4 hidden sm:table-cell">Aile Üyesi</th>
              <th className="py-3 px-4 hidden md:table-cell">Ödeme Şekli</th>
              <th className="py-3 px-4 text-right">Tutar</th>
              <th className="py-3 px-4 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const tone = txTone(tx.type);
              const convertedAmount = convertCurrency(tx.amount, tx.currency, currency);

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group"
                >
                  {/* Tarih */}
                  <td className="py-3 px-4 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {tx.date.split('-').reverse().join('.')}
                  </td>

                  {/* Açıklama */}
                  <td className="py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${tone.badge}`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                      </span>
                      <span className="truncate">{tx.description}</span>
                      {tx.isRecurring && (
                        <span title="Aylık Tekrarlayan">
                          <Repeat className="w-3 h-3 text-neutral-400 shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                    {tx.category}
                  </td>

                  {/* Aile Üyesi */}
                  <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 hidden sm:table-cell whitespace-nowrap">
                    {tx.member}
                  </td>

                  {/* Ödeme Şekli */}
                  <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 hidden md:table-cell whitespace-nowrap">
                    {tx.type === 'expense' ? tx.paymentMethod : '—'}
                  </td>

                  {/* Tutar */}
                  <td
                    className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums ${tone.text}`}
                  >
                    {tone.sign}
                    {formatCurrency(convertedAmount, currency)}
                  </td>

                  {/* İşlem butonları */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(tx)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${tx.description}" işlemini silmek istediğinize emin misiniz?`)) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

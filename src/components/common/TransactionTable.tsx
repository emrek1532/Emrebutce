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

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
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
              const convertedAmount = convertCurrency(tx.amount, tx.currency, currency);

              return (
                <tr
                  key={tx.id}
                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group"
                >
                  {/* Tarih */}
                  <td className="py-3 px-4 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {tx.date}
                  </td>

                  {/* Açıklama */}
                  <td className="py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                        }`}
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
                    {tx.paymentMethod}
                  </td>

                  {/* Tutar */}
                  <td
                    className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                      isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
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

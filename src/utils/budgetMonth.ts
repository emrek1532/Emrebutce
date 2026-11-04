// Bütçe ayı: işlemin hangi ayın bütçesine sayıldığı (YYYY-MM).
// Ay sonunda yatan maaş gibi "sonraki aya devreden" gelirlerde tarihten farklıdır:
// 30 Ekim'de yatan maaş Kasım bütçesine sayılır.
import type { Transaction } from '../types/budget';

export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const shiftMonthKey = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
};

// Hesaptan para çıkışı sayılan gider: kartla yapılan alışveriş değil (o, kart borcu ödenince çıkar);
// ama Borçlar'dan ödenen kredi/taksit her zaman gerçek ödemedir (yöntemi yanlışlıkla kart görünse de).
export const isCashExpense = (tx: Pick<Transaction, 'type' | 'paymentMethod' | 'installmentInfo'>) =>
  tx.type === 'expense' && (tx.paymentMethod !== 'Kredi Kartı' || !!tx.installmentInfo?.installmentId);

export const budgetMonthOf = (tx: Pick<Transaction, 'date' | 'budgetMonth'>) => tx.budgetMonth || tx.date.slice(0, 7);

// Ayın bu gününden sonra yatan gelir varsayılan olarak sonraki aya sayılır
export const CARRY_DEFAULT_FROM_DAY = 20;

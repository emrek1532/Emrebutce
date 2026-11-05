// Borç kapatma simülasyonu ("kartopu"): her borç kendi taksitini öder; fazladan para ve biten borçlardan
// boşa çıkan taksitler kalanı en az olan borca gider. Faiz oranı girilmiş borçlarda kalan anapara
// faizle birlikte izlenir, böylece erken kapatmanın faiz kazancı hesaplanır.
import type { InstallmentDebt } from '../types/budget';

export interface PlanDebt {
  id: string;
  title: string;
  balance: number; // kalan taksitlerin toplamı
  monthly: number;
  start: number; // bu ayın taksiti ödendiyse 1
  rate?: number; // aylık faiz (ör. 0.0349)
  count?: number; // kalan taksit sayısı (faizli hesap için)
}

export const remainingOf = (i: InstallmentDebt) =>
  i.schedule ? i.schedule.filter((s) => !s.paid).reduce((s, x) => s + x.amount, 0) : (i.remainingInstallments ?? 0) * i.monthlyAmount;

export const monthlyOf = (i: InstallmentDebt) =>
  i.schedule ? Math.max(0, ...i.schedule.filter((s) => !s.paid).map((s) => s.amount)) : i.monthlyAmount;

export function toPlanDebt(i: InstallmentDebt, paidThisMonth: boolean): PlanDebt {
  const rate = !i.schedule && i.monthlyInterestRate ? i.monthlyInterestRate / 100 : undefined;
  return {
    id: i.id,
    title: i.title,
    balance: remainingOf(i),
    monthly: monthlyOf(i),
    start: paidThisMonth ? 1 : 0,
    rate,
    count: rate ? i.remainingInstallments ?? 0 : undefined
  };
}

// Faizli borçta kalan anapara: kalan taksitlerin bugünkü değeri
const principalOf = (d: PlanDebt) =>
  d.rate && d.count ? (d.monthly * (1 - Math.pow(1 + d.rate, -d.count))) / d.rate : d.balance;

export function simulate(debts: PlanDebt[], extra: number) {
  const bal = new Map(debts.map((d) => [d.id, principalOf(d)]));
  const done = new Map<string, number>();
  let month = 0;
  let totalPaid = 0;
  while ([...bal.values()].some((b) => b > 0.01) && month < 600) {
    let pool = extra;
    for (const d of debts) {
      if (month < d.start) continue;
      let b = bal.get(d.id)!;
      if (b <= 0.01) {
        if (extra > 0) pool += d.monthly; // biten borcun taksiti kartopuna eklenir
        continue;
      }
      if (d.rate) b += b * d.rate;
      const pay = Math.min(d.monthly, b);
      bal.set(d.id, b - pay);
      totalPaid += pay;
      if (extra > 0) pool += d.monthly - pay;
    }
    const open = debts.filter((d) => bal.get(d.id)! > 0.01 && month >= d.start).sort((a, b) => bal.get(a.id)! - bal.get(b.id)!);
    for (const d of open) {
      if (pool <= 0) break;
      const b = bal.get(d.id)!;
      const pay = Math.min(pool, b);
      bal.set(d.id, b - pay);
      totalPaid += pay;
      pool -= pay;
    }
    for (const d of debts) if (!done.has(d.id) && bal.get(d.id)! <= 0.01) done.set(d.id, month);
    month++;
  }
  return { months: month, done, totalPaid };
}

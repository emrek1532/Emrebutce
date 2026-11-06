// "Tekliflere sor" benzeri soru-cevap: telefon soruyla ilgili kalemleri hazırlar, yapay zekâ hangi
// kalemlerin ve hangi ölçünün sorulduğunu seçer, toplamı burada kesin olarak hesaplarız.
import type { CreditCardAccount, InstallmentDebt, RecurringItem, Transaction } from '../types/budget';
import { budgetMonthOf, monthKeyOf, shiftMonthKey } from './budgetMonth';
import { availableLimitOf, minimumPaymentOf, statementDebtOf } from './cardStatement';

export type AskMetric = 'buAy' | 'gelecekAy' | 'kalanToplam' | 'asgari' | 'kalanLimit' | 'tutar' | 'bitis' | 'yok';

export interface AskItem {
  id: string;
  tur: 'taksit' | 'kart' | 'duzenli-gider' | 'duzenli-gelir' | 'islem';
  ad: string;
  alacakli?: string;
  not?: string;
  kimin?: string;
  kategori?: string;
  tarih?: string;
  yontem?: string;
  // Hesap için (sunucuya gitmez)
  values: Partial<Record<Exclude<AskMetric, 'yok' | 'bitis'>, number>> & { bitis?: string };
}

const TX_WORDS = /harca|gelir|kazan|maa[sş]|işlem|islem|aldım|aldim|ödedim|odedim|market|benzin|akaryakıt|fatura|kategori|nereye|restoran|yemek|alışveriş|alisveris|giyim|sağlık|saglik|geçen ay|gecen ay/i;

function monthAmountOf(i: InstallmentDebt, month: string): number {
  if (i.schedule) return i.schedule.filter((s) => s.date.startsWith(month)).reduce((s, x) => s + x.amount, 0);
  const total = i.totalInstallments;
  if (!total) return i.monthlyAmount;
  const start = (i.startDate || '').slice(0, 7);
  const end = (i.endDate || '').slice(0, 7);
  return (!start || start <= month) && (!end || month <= end) ? i.monthlyAmount : 0;
}

function remainingOf(i: InstallmentDebt): number {
  if (i.schedule) return i.schedule.filter((s) => !s.paid).reduce((s, x) => s + x.amount, 0);
  return i.totalInstallments ? (i.remainingInstallments ?? 0) * i.monthlyAmount : i.monthlyAmount;
}

export function buildAskItems(
  question: string,
  data: { installments: InstallmentDebt[]; creditCards: CreditCardAccount[]; recurring: RecurringItem[]; transactions: Transaction[] }
): AskItem[] {
  const now = monthKeyOf(new Date());
  const next = shiftMonthKey(now, 1);
  const items: AskItem[] = [];
  for (const i of data.installments) {
    items.push({
      id: `t:${i.id}`,
      tur: 'taksit',
      ad: i.title,
      alacakli: i.creditor || undefined,
      not: i.notes || undefined,
      kimin: i.member,
      values: { buAy: monthAmountOf(i, now), gelecekAy: monthAmountOf(i, next), kalanToplam: remainingOf(i), bitis: i.endDate }
    });
  }
  for (const c of data.creditCards) {
    items.push({
      id: `k:${c.id}`,
      tur: 'kart',
      ad: `${c.bank} ${c.name}`.trim(),
      kimin: c.member,
      not: c.notes || undefined,
      values: {
        buAy: statementDebtOf(c),
        kalanToplam: c.currentDebt,
        asgari: minimumPaymentOf(c),
        kalanLimit: availableLimitOf(c)
      }
    });
  }
  for (const r of data.recurring.filter((x) => x.active)) {
    items.push({
      id: `d:${r.id}`,
      tur: r.type === 'income' ? 'duzenli-gelir' : 'duzenli-gider',
      ad: r.title,
      kimin: r.member,
      kategori: r.category,
      values: { buAy: r.amount, tutar: r.amount, gelecekAy: r.amount }
    });
  }
  // İşlemler yalnızca soru harcama/gelir hakkındaysa gönderilir (son 3 ay, en fazla 250)
  if (TX_WORDS.test(question)) {
    const from = shiftMonthKey(now, -2);
    data.transactions
      .filter((t) => budgetMonthOf(t) >= from && t.type !== 'saving')
      .slice(0, 250)
      .forEach((t) =>
        items.push({
          id: `i:${t.id}`,
          tur: 'islem',
          ad: t.description,
          kategori: t.category,
          kimin: t.member,
          tarih: t.date,
          yontem: `${t.type === 'income' ? 'gelir' : 'harcama'} · ${t.paymentMethod}`,
          values: { tutar: t.amount }
        })
      );
  }
  return items;
}

// Sunucuya gidecek hali: hesap alanları (values) çıkarılır, sadece ad/tür/tarih gibi bilgiler gider
export const toWire = (items: AskItem[]) => items.map(({ values, ...rest }) => ({ ...rest, ...(values.bitis ? { bitis: values.bitis } : {}) }));

export interface AskAnswer {
  intro: string;
  note?: string;
  metric: AskMetric;
  total?: number;
  rows: { label: string; value: string | number }[];
}

export function computeAnswer(items: AskItem[], res: { ids: string[]; metric: AskMetric; intro: string; note?: string }): AskAnswer {
  const byId = new Map(items.map((i) => [i.id, i]));
  const chosen = res.ids.map((id) => byId.get(id)).filter((x): x is AskItem => !!x);
  if (res.metric === 'yok' || chosen.length === 0) {
    return { intro: res.intro || 'Bu soruyu mevcut verilerle cevaplayamadım.', note: res.note, metric: 'yok', rows: [] };
  }
  if (res.metric === 'bitis') {
    return {
      intro: res.intro,
      note: res.note,
      metric: 'bitis',
      rows: chosen.map((c) => ({ label: c.ad, value: c.values.bitis ? c.values.bitis.split('-').reverse().join('.') : '—' }))
    };
  }
  const metric = res.metric;
  const rows = chosen
    .map((c) => ({ label: c.ad, value: Math.round(((c.values as any)[metric] ?? 0) * 100) / 100 }))
    .filter((r) => r.value !== 0 || chosen.length === 1);
  const total = Math.round(rows.reduce((s, r) => s + (r.value as number), 0) * 100) / 100;
  return { intro: res.intro, note: res.note, metric, total, rows };
}

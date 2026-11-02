// "Cebim Veri Şablonu" Excel dosyasını uygulama verisine çevirir.
// Kimlikler satır adından üretilir: aynı dosya tekrar yüklenirse kayıtlar çoğalmaz, güncellenir.
import type { Cell, Sheets } from './xlsxReader';
import type {
  CreditCardAccount,
  InstallmentDebt,
  InstallmentScheduleItem,
  PaymentMethod,
  RecurringItem,
  Transaction,
  TransactionType
} from '../types/budget';

export interface ExcelImportResult {
  creditCards: CreditCardAccount[];
  installments: InstallmentDebt[];
  recurring: RecurringItem[];
  transactions: Transaction[];
  warnings: string[];
}

const norm = (s: unknown) =>
  String(s ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü]+/g, ' ')
    .trim();

const slug = (s: string) => norm(s).replace(/\s+/g, '-').slice(0, 60) || 'kayit';

function toNumber(v: Cell): number | null {
  if (v === null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[^\d.,-]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const toDay = (v: Cell): number | null => {
  const n = toNumber(v);
  return n === null ? null : Math.min(31, Math.max(1, Math.round(n)));
};

const isYes = (v: Cell) => /^(e|evet|x|✓|1|true|ödendi|odendi)/i.test(String(v ?? '').trim());

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Excel tarihi (seri sayı), "02.11.2026", "2026-11-02" → YYYY-MM-DD
function toDate(v: Cell): string | null {
  if (v === null || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  return null;
}

// Ay hücresi: tarih, "11.2026", "2026-11", "Kasım 2026" → { y, m }
const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
function toMonth(v: Cell): { y: number; m: number } | null {
  if (typeof v === 'number') {
    const d = toDate(v);
    return d ? { y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) } : null;
  }
  const s = String(v ?? '').trim().toLocaleLowerCase('tr-TR');
  let m = s.match(/^(\d{1,2})[./-](\d{4})$/);
  if (m) return { y: Number(m[2]), m: Number(m[1]) };
  m = s.match(/^(\d{4})[./-](\d{1,2})/);
  if (m) return { y: Number(m[1]), m: Number(m[2]) };
  const full = toDate(v);
  if (full) return { y: Number(full.slice(0, 4)), m: Number(full.slice(5, 7)) };
  const idx = MONTHS.findIndex((name) => s.startsWith(name));
  const year = s.match(/(\d{4})/);
  if (idx >= 0 && year) return { y: Number(year[1]), m: idx + 1 };
  return null;
}

const monthDate = (y: number, m: number, day: number) => {
  const last = new Date(y, m, 0).getDate();
  return `${y}-${pad(m)}-${pad(Math.min(day, last))}`;
};
const addMonths = (y: number, m: number, k: number) => {
  const t = y * 12 + (m - 1) + k;
  return { y: Math.floor(t / 12), m: (t % 12) + 1 };
};

// Başlık satırına göre sütun bulur (sütun sırası değişse de çalışır)
function table(sheets: Sheets, sheetHint: string) {
  const name = Object.keys(sheets).find((n) => norm(n).startsWith(norm(sheetHint)));
  const rows = name ? sheets[name] : [];
  const header = (rows[0] ?? []).map((h) => norm(h));
  const col = (hint: string) => header.findIndex((h) => h.startsWith(norm(hint)));
  const data = rows.slice(1).filter((r) => r && r.some((c) => c !== null && String(c).trim() !== ''));
  return { found: Boolean(name), data, get: (row: Cell[], hint: string): Cell => { const i = col(hint); return i >= 0 ? row[i] ?? null : null; } };
}

const PAYMENT_METHODS: PaymentMethod[] = ['Nakit', 'Kredi Kartı', 'Banka Kartı', 'Havale/EFT'];
const toPayment = (v: Cell, fallback: PaymentMethod): PaymentMethod => {
  const s = norm(v);
  if (!s) return fallback;
  return PAYMENT_METHODS.find((p) => norm(p) === s || s.startsWith(norm(p).split(' ')[0])) ?? fallback;
};

const INSTALLMENT_CATEGORY = (kind: string) => (norm(kind).includes('eminevim') ? 'Konut & Birikim' : 'Borç & Kredi');

export function buildImportFromSheets(
  sheets: Sheets,
  opts: { members: string[]; existingCards: CreditCardAccount[]; today?: Date }
): ExcelImportResult {
  const today = opts.today ?? new Date();
  const thisY = today.getFullYear();
  const thisM = today.getMonth() + 1;
  const nowIso = today.toISOString();
  const warnings: string[] = [];

  const defaultMember = opts.members.find((m) => norm(m) === 'ortak') ?? opts.members[0] ?? 'Ortak';
  const toMember = (v: Cell) => {
    const s = norm(v);
    if (!s) return defaultMember;
    return opts.members.find((m) => norm(m) === s || norm(m).split(' ')[0] === s.split(' ')[0]) ?? defaultMember;
  };

  // --- Kredi kartları ---
  const creditCards: CreditCardAccount[] = [];
  const cardsT = table(sheets, 'Kredi Kartları');
  for (const r of cardsT.data) {
    const name = String(cardsT.get(r, 'Kart Adı') ?? '').trim();
    if (!name) continue;
    creditCards.push({
      id: `xl-card-${slug(name)}`,
      name,
      bank: String(cardsT.get(r, 'Banka') ?? '').trim() || name,
      member: toMember(cardsT.get(r, 'Kimin')),
      limit: toNumber(cardsT.get(r, 'Limit')) ?? 0,
      currentDebt: toNumber(cardsT.get(r, 'Güncel')) ?? 0,
      statementDay: toDay(cardsT.get(r, 'Hesap Kesim')) ?? 1,
      dueDay: toDay(cardsT.get(r, 'Son Ödeme')) ?? 10,
      notes: String(cardsT.get(r, 'Not') ?? '').trim() || undefined
    });
  }
  const allCards = [...creditCards, ...opts.existingCards.filter((c) => !creditCards.some((n) => n.id === c.id))];
  const findCard = (v: Cell) => {
    const s = norm(v);
    if (!s) return undefined;
    return allCards.find((c) => norm(c.name) === s) ?? allCards.find((c) => norm(c.name).includes(s) || s.includes(norm(c.name)) || norm(c.bank) === s);
  };

  // --- Düzenli gelirler ve giderler ---
  const recurring: RecurringItem[] = [];
  const addRecurring = (sheet: string, type: TransactionType, defaultCategory: string) => {
    const t = table(sheets, sheet);
    for (const r of t.data) {
      const title = String(t.get(r, sheet === 'Gelirler' ? 'Gelir Adı' : 'Gider Adı') ?? '').trim();
      const amount = toNumber(t.get(r, 'Aylık Tutar'));
      if (!title) continue;
      if (!amount) {
        warnings.push(`${sheet}: "${title}" tutarı boş, atlandı.`);
        continue;
      }
      const card = type === 'expense' ? findCard(t.get(r, 'Kart')) : undefined;
      const cardName = t.get(r, 'Kart');
      if (cardName && !card) warnings.push(`${sheet}: "${title}" için "${cardName}" kartı bulunamadı.`);
      recurring.push({
        id: `xl-rec-${type}-${slug(title)}`,
        title,
        type,
        amount,
        category: String(t.get(r, 'Kategori') ?? '').trim() || defaultCategory,
        member: toMember(t.get(r, 'Kimin')),
        dayOfMonth: toDay(t.get(r, 'Ayın Kaçında')) ?? 1,
        paymentMethod: card ? 'Kredi Kartı' : type === 'income' ? 'Havale/EFT' : toPayment(t.get(r, 'Ödeme'), 'Havale/EFT'),
        active: true,
        cardId: card?.id
      });
    }
  };
  addRecurring('Gelirler', 'income', 'Maaş & Ücret');
  addRecurring('Sabit Giderler', 'expense', 'Diğer Harcamalar');

  // --- Taksitli borçlar ---
  const installments: InstallmentDebt[] = [];
  const transactions: Transaction[] = [];
  const paidThisMonth = new Set<string>();
  const missingCount = new Set<string>();
  const instT = table(sheets, 'Taksitli Borçlar');
  for (const r of instT.data) {
    const title = String(instT.get(r, 'Borç Adı') ?? '').trim();
    if (!title) continue;
    const kind = String(instT.get(r, 'Tür') ?? '').trim() || 'Diğer Borç';
    const monthly = toNumber(instT.get(r, 'Aylık Taksit')) ?? 0;
    const remaining = toNumber(instT.get(r, 'Kalan Taksit'));
    const totalRaw = toNumber(instT.get(r, 'Toplam Taksit'));
    const paidNow = isYes(instT.get(r, 'Bu Ay Ödendi'));
    const day = toDay(instT.get(r, 'Ödeme Günü')) ?? 1;
    if (remaining === null && totalRaw === null) missingCount.add(`xl-inst-${slug(title)}`);
    const rem = Math.max(0, Math.round(remaining ?? 0));
    const total = Math.max(rem + (paidNow ? 1 : 0), Math.round(totalRaw ?? rem + (paidNow ? 1 : 0)));
    const paid = total - rem;
    // İlk ödeme ayı: bu ay ödendiyse ödenenlerin sonuncusu bu ay, değilse geçen ay
    const first = addMonths(thisY, thisM, paidNow ? -(paid - 1) : -paid);
    const last = addMonths(first.y, first.m, Math.max(0, total - 1));
    installments.push({
      id: `xl-inst-${slug(title)}`,
      title,
      creditor: String(instT.get(r, 'Banka') ?? '').trim() || kind,
      member: toMember(instT.get(r, 'Kimin')),
      monthlyAmount: monthly,
      totalInstallments: total || undefined,
      remainingInstallments: rem,
      paidInstallments: paid,
      paymentDayOfMonth: day,
      startDate: monthDate(first.y, first.m, day),
      endDate: monthDate(last.y, last.m, day),
      category: INSTALLMENT_CATEGORY(kind),
      notes: [kind, String(instT.get(r, 'Not') ?? '').trim()].filter(Boolean).join(' · ') || undefined
    });
    if (paidNow) paidThisMonth.add(`xl-inst-${slug(title)}`);
  }

  // --- Değişken tutarlı planlar (Eminevim gibi) ---
  const schedT = table(sheets, 'Değişken Taksitler');
  const groups = new Map<string, { title: string; items: { y: number; m: number; amount: number; paid: boolean }[] }>();
  for (const r of schedT.data) {
    const title = String(schedT.get(r, 'Borç Adı') ?? '').trim();
    const month = toMonth(schedT.get(r, 'Ay'));
    const amount = toNumber(schedT.get(r, 'Tutar'));
    if (!title) continue;
    if (!month || !amount) {
      warnings.push(`Değişken Taksitler: "${title}" satırında ay ya da tutar okunamadı.`);
      continue;
    }
    const key = slug(title);
    const g = groups.get(key) ?? { title, items: [] };
    g.items.push({ ...month, amount, paid: isYes(schedT.get(r, 'Ödendi')) });
    groups.set(key, g);
  }
  for (const [key, g] of groups) {
    g.items.sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m));
    let inst = installments.find((i) => i.id === `xl-inst-${key}`);
    if (!inst) {
      inst = {
        id: `xl-inst-${key}`,
        title: g.title,
        creditor: g.title,
        member: defaultMember,
        monthlyAmount: 0,
        paymentDayOfMonth: 1,
        startDate: '',
        endDate: '',
        category: INSTALLMENT_CATEGORY(g.title)
      };
      installments.push(inst);
    }
    const day = inst.paymentDayOfMonth;
    const schedule: InstallmentScheduleItem[] = g.items.map((it, i) => ({
      period: i + 1,
      date: monthDate(it.y, it.m, day),
      amount: it.amount,
      paid: it.paid
    }));
    const paidCount = schedule.filter((s) => s.paid).length;
    const next = schedule.find((s) => !s.paid);
    Object.assign(inst, {
      isVariableSchedule: true,
      schedule,
      totalInstallments: schedule.length,
      paidInstallments: paidCount,
      remainingInstallments: schedule.length - paidCount,
      monthlyAmount: next?.amount ?? schedule[schedule.length - 1].amount,
      startDate: schedule[0].date,
      endDate: schedule[schedule.length - 1].date
    });
    const current = g.items.findIndex((it) => it.y === thisY && it.m === thisM);
    if (current >= 0 && g.items[current].paid) paidThisMonth.add(inst.id);
    else paidThisMonth.delete(inst.id);
  }

  for (const inst of installments) {
    if (missingCount.has(inst.id) && !inst.schedule) {
      warnings.push(`Taksitli Borçlar: "${inst.title}" için kalan taksit sayısı yazılmamış.`);
    }
  }

  // Bu ay ödenmiş taksitler: özette görünsün diye bu ayın ödeme kaydı oluşturulur
  for (const inst of installments) {
    if (!paidThisMonth.has(inst.id)) continue;
    const item = inst.schedule?.find((s) => s.date.startsWith(`${thisY}-${pad(thisM)}`));
    const total = inst.schedule ? inst.schedule.length : inst.totalInstallments ?? 0;
    const current = item ? item.period : inst.paidInstallments ?? 0;
    const date = monthDate(thisY, thisM, Math.min(inst.paymentDayOfMonth, today.getDate()));
    const creditor = norm(inst.creditor);
    const byCard = allCards.some((c) => creditor.includes(norm(c.bank)) || creditor.includes(norm(c.name)));
    transactions.push({
      id: `xl-pay-${inst.id}-${thisY}-${pad(thisM)}`,
      type: 'expense',
      amount: item ? item.amount : inst.monthlyAmount,
      currency: 'TRY',
      category: inst.category,
      member: inst.member,
      date,
      description: `${inst.title} taksiti${total ? ` (${current}/${total})` : ''}`,
      paymentMethod: byCard ? 'Kredi Kartı' : 'Havale/EFT',
      installmentInfo: { current, total, installmentId: inst.id },
      createdAt: nowIso
    });
  }

  // --- Tek seferlik işlemler ---
  const txT = table(sheets, 'Tek Seferlik');
  for (const [idx, r] of txT.data.entries()) {
    const description = String(txT.get(r, 'Açıklama') ?? '').trim();
    const amount = toNumber(txT.get(r, 'Tutar'));
    if (!description && !amount) continue;
    if (!amount) {
      warnings.push(`Tek Seferlik: "${description}" tutarı boş, atlandı.`);
      continue;
    }
    const kind = norm(txT.get(r, 'Tür'));
    const type: TransactionType = kind.startsWith('gelir') ? 'income' : kind.startsWith('birikim') ? 'saving' : 'expense';
    const date = toDate(txT.get(r, 'Tarih')) ?? ymd(today);
    const card = type === 'expense' ? findCard(txT.get(r, 'Kart')) : undefined;
    transactions.push({
      id: `xl-tx-${date}-${slug(description)}-${idx + 2}`,
      type,
      amount,
      currency: 'TRY',
      category:
        String(txT.get(r, 'Kategori') ?? '').trim() ||
        (type === 'income' ? 'Diğer Gelirler' : type === 'saving' ? 'Birikim' : 'Diğer Harcamalar'),
      member: toMember(txT.get(r, 'Kimin')),
      date,
      description: description || 'İşlem',
      paymentMethod: card ? 'Kredi Kartı' : type === 'expense' ? toPayment(txT.get(r, 'Ödeme'), 'Nakit') : 'Havale/EFT',
      cardId: card?.id,
      createdAt: nowIso
    });
  }

  if (!cardsT.found && !instT.found && !table(sheets, 'Gelirler').found && !txT.found) {
    throw new Error('Bu dosya Cebim veri şablonu değil. Önce "Boş Excel Şablonu" indirip onu doldurun.');
  }

  return { creditCards, installments, recurring, transactions, warnings };
}

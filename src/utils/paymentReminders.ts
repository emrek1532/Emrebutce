// Yaklaşan ödemeler: kart son ödeme günleri, taksitler ve düzenli giderler.
// Telefon bildirimi açıksa bu liste (ad, tutar, gün) sunucuya gönderilir; sunucu her sabah 09:00'da
// 3 gün kala, 1 gün kala ve ödeme günü bildirim atar. Diğer veriler şifreli kasada kalır.
import type { CreditCardAccount, InstallmentDebt, RecurringItem, Transaction } from '../types/budget';
import { budgetMonthOf, monthKeyOf } from './budgetMonth';
import { callRpc, SUPABASE_URL } from './cloudStore';
import { minimumPaymentOf, statementDebtOf } from './cardStatement';

export interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  day: number;
  // Bu ay zaten ödendiyse o ay hatırlatılmaz
  skipMonth?: string;
}

const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

export function buildReminders(data: {
  creditCards: CreditCardAccount[];
  installments: InstallmentDebt[];
  recurring: RecurringItem[];
  transactions: Transaction[];
}): PaymentReminder[] {
  const month = monthKeyOf(new Date());
  const list: PaymentReminder[] = [];

  for (const c of data.creditCards) {
    const due = statementDebtOf(c);
    if (due > 0) {
      const name = norm(c.name).includes(norm(c.bank)) ? c.name : `${c.bank} ${c.name}`;
      list.push({ id: `card-${c.id}`, title: `${name} ekstre (${minimumPaymentOf(c) > 0 ? `asgari ${minimumPaymentOf(c).toLocaleString('tr-TR')} ₺` : 'asgari ödendi'})`, amount: Math.round(due * 100) / 100, day: c.dueDay });
    }
  }

  for (const i of data.installments) {
    const total = i.schedule ? i.schedule.length : i.totalInstallments;
    if (total && (i.remainingInstallments ?? 0) <= 0) continue;
    // Kartla ödenen taksit zaten kart ekstresinde: ayrıca hatırlatma
    const creditor = norm(i.creditor);
    if (data.creditCards.some((c) => creditor.includes(norm(c.bank)) || creditor.includes(norm(c.name)))) continue;
    const amount = i.schedule ? i.schedule.find((s) => !s.paid)?.amount ?? 0 : i.monthlyAmount;
    const paid = data.transactions.some((t) => t.installmentInfo?.installmentId === i.id && t.date.startsWith(month));
    list.push({ id: `inst-${i.id}`, title: i.title, amount, day: i.paymentDayOfMonth, skipMonth: paid ? month : undefined });
  }

  for (const r of data.recurring) {
    if (!r.active || r.type !== 'expense' || r.paymentMethod === 'Kredi Kartı') continue;
    const posted = data.transactions.some((t) => t.id.startsWith(`rec-${r.id}-`) && budgetMonthOf(t) === month);
    list.push({ id: `rec-${r.id}`, title: r.title, amount: r.amount, day: r.dayOfMonth, skipMonth: posted ? month : undefined });
  }
  return list.filter((r) => r.amount > 0);
}

// Uygulama içi liste için: önümüzdeki N gün içindeki ödemeler
export function upcoming(reminders: PaymentReminder[], withinDays = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return reminders
    .map((r) => {
      const build = (y: number, m: number) => new Date(y, m, Math.min(r.day, new Date(y, m + 1, 0).getDate()));
      let date = build(today.getFullYear(), today.getMonth());
      if (date < today) date = build(today.getFullYear(), today.getMonth() + 1);
      const days = Math.round((date.getTime() - today.getTime()) / 86400000);
      const skipped = r.skipMonth === monthKeyOf(date);
      return { ...r, date, days, skipped };
    })
    .filter((r) => r.days <= withinDays && !r.skipped)
    .sort((a, b) => a.days - b.days);
}

// ---------- Telefon bildirimi ----------
const PUSH_FLAG = 'cebim_push_on';
const LAST_SENT = 'cebim_push_last';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushEnabled = () => {
  try {
    return localStorage.getItem(PUSH_FLAG) === '1' && Notification.permission === 'granted';
  } catch {
    return false;
  }
};

function base64UrlToBytes(b64: string): Uint8Array {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function sha256Hex(text: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function save(sub: PushSubscription, vaultId: string, reminders: PaymentReminder[]) {
  const json = sub.toJSON();
  const res = await callRpc('save_push_reminders', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_vault_hash: await sha256Hex(`cebim:${vaultId}`),
    p_reminders: reminders
  });
  if (!res.ok) throw new Error('Bildirim ayarı sunucuya kaydedilemedi');
}

export async function enablePush(vaultId: string, reminders: PaymentReminder[]): Promise<void> {
  if (!pushSupported()) {
    throw new Error('Bu tarayıcı bildirimleri desteklemiyor. iPhone\'da önce "Ana Ekrana Ekle" ile uygulamayı yükleyin.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bildirim izni verilmedi. Tarayıcı ayarlarından bu siteye bildirim izni verin.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/cebim?action=vapid`);
    const { publicKey } = await res.json();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) as BufferSource });
  }
  await save(sub, vaultId, reminders);
  localStorage.setItem(PUSH_FLAG, '1');
  localStorage.setItem(LAST_SENT, JSON.stringify(reminders));
}

export async function disablePush(): Promise<void> {
  localStorage.removeItem(PUSH_FLAG);
  localStorage.removeItem(LAST_SENT);
  const sub = await currentSubscription();
  if (sub) {
    await callRpc('disable_push_subscription', { p_endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
}

// Ödeme listesi değiştiyse sunucudaki kopyayı günceller (değişmediyse istek atmaz)
export async function syncRemindersIfChanged(vaultId: string, reminders: PaymentReminder[]): Promise<void> {
  if (!pushEnabled() || !vaultId) return;
  const text = JSON.stringify(reminders);
  if (localStorage.getItem(LAST_SENT) === text) return;
  const sub = await currentSubscription();
  if (!sub) return;
  await save(sub, vaultId, reminders);
  localStorage.setItem(LAST_SENT, text);
}

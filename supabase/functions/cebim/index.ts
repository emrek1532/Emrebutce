// Cebim sunucu işlevi (Supabase Edge Function, JWT doğrulaması kapalı; kendi anahtarlarıyla korunur)
//   GET  ?action=prices  → Harem Altın alış fiyatları (altın ayarları, sikkeler, döviz)
//   GET  ?action=vapid   → telefon bildirimi için açık anahtar
//   POST ?action=cron    → (sadece zamanlayıcı) yaklaşan ödemeler için bildirim gönderir
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { io } from 'npm:socket.io-client@4.7.5';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

async function getSecret(name: string): Promise<string | null> {
  const { data } = await db.from('app_secrets').select('value').eq('name', name).maybeSingle();
  return data?.value ?? null;
}

// VAPID anahtarları ilk kullanımda üretilip veritabanında saklanır
async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pub = await getSecret('vapid_public');
  const priv = await getSecret('vapid_private');
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const keys = webpush.generateVAPIDKeys();
  await db.from('app_secrets').upsert([
    { name: 'vapid_public', value: keys.publicKey },
    { name: 'vapid_private', value: keys.privateKey }
  ]);
  return keys;
}

// ---------- Harem Altın fiyatları ----------
let priceCache: { at: number; body: unknown } | null = null;

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v.trim()) return null;
  let s = v.trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Harem Altın canlı fiyatları socket.io ile yayınlar ("price_changed"). Bağlanıp ilk tam listeyi alır,
// kısa süre gelen güncellemeleri birleştirir ve bağlantıyı kapatır.
const HAREM_SOCKET = 'wss://hrmsocketonly.haremaltin.com';
const REQUIRED = ['ALTIN', 'AYAR14', 'AYAR22', 'CEYREK_YENI', 'USDTRY', 'EURTRY'];

function harem(): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const data: Record<string, any> = {};
    const socket = io(HAREM_SOCKET, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000,
      extraHeaders: { Origin: 'https://canlipiyasalar.haremaltin.com', 'User-Agent': 'Mozilla/5.0 Cebim' }
    } as any);
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      if (REQUIRED.every((k) => data[k])) resolve(data);
      else reject(err ?? new Error('Harem fiyatları alınamadı'));
    };
    const timer = setTimeout(() => finish(), 8000);
    socket.on('connect_error', (e: any) => finish(new Error(`Harem bağlantı hatası: ${e?.message ?? e}`)));
    socket.on('price_changed', (msg: any) => {
      Object.assign(data, msg?.data ?? {});
      if (REQUIRED.every((k) => data[k])) setTimeout(() => finish(), 300);
    });
  });
}

async function prices(debug: boolean) {
  if (!debug && priceCache && Date.now() - priceCache.at < 5 * 60 * 1000) return priceCache.body;
  const d = await harem();
  if (debug) return { keys: Object.keys(d), sample: d.ALTIN, usd: d.USDTRY, a14: d.AYAR14 };
  const buy = (code: string) => num(d?.[code]?.alis);
  const has = buy('ALTIN');
  const items: Record<string, number | null> = {
    has,
    ayar22: buy('AYAR22') ?? (has ? has * 0.916 : null),
    ayar18: buy('AYAR18') ?? (has ? has * 0.75 : null),
    ayar14: buy('AYAR14') ?? (has ? has * 0.585 : null),
    ceyrek: buy('CEYREK_YENI') ?? buy('CEYREK_ESKI'),
    yarim: buy('YARIM_YENI') ?? buy('YARIM_ESKI'),
    tam: buy('TEK_YENI') ?? buy('TEK_ESKI'),
    ata: buy('ATA_YENI') ?? buy('ATA_ESKI'),
    gremse: buy('GREMESE_YENI') ?? buy('GREMESE_ESKI'),
    ata5: buy('ATA5_YENI') ?? buy('ATA5_ESKI'),
    gumus: buy('GUMUSTRY'),
    USD: buy('USDTRY'),
    EUR: buy('EURTRY'),
    GBP: buy('GBPTRY')
  };
  const body = { source: 'Harem Altın', basis: 'alış', updatedAt: new Date().toISOString(), haremTime: d?.ALTIN?.tarih ?? null, items };
  priceCache = { at: Date.now(), body };
  return body;
}

// ---------- Ödeme hatırlatmaları ----------
interface Reminder {
  id: string;
  title: string;
  amount: number;
  day: number;
  skipMonth?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const money = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n) + ' ₺';

// Türkiye saatine göre bugün
function trToday() {
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
}

function dueInfo(r: Reminder, t: { y: number; m: number; d: number }) {
  const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  let y = t.y;
  let m = t.m;
  let day = Math.min(r.day, lastDay(y, m));
  if (day < t.d) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    day = Math.min(r.day, lastDay(y, m));
  }
  const days = Math.round((Date.UTC(y, m - 1, day) - Date.UTC(t.y, t.m - 1, t.d)) / 86400000);
  return { days, month: `${y}-${pad(m)}` };
}

async function runCron() {
  const t = trToday();
  const todayStr = `${t.y}-${pad(t.m)}-${pad(t.d)}`;
  const keys = await vapidKeys();
  webpush.setVapidDetails('mailto:bildirim@cebim.app', keys.publicKey, keys.privateKey);
  const { data: subs, error } = await db.from('push_subscriptions').select('*').eq('active', true);
  if (error) throw error;
  let sent = 0;
  for (const s of subs ?? []) {
    if (s.last_sent_on === todayStr) continue;
    const due = (s.reminders as Reminder[])
      .map((r) => ({ r, ...dueInfo(r, t) }))
      .filter((x) => [0, 1, 3].includes(x.days) && x.r.skipMonth !== x.month && x.r.amount > 0)
      .sort((a, b) => a.days - b.days);
    if (due.length === 0) continue;
    const label = (days: number) => (days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : `${days} gün sonra`);
    const total = due.reduce((sum, x) => sum + x.r.amount, 0);
    const payload = JSON.stringify({
      title: due.length === 1 ? `${label(due[0].days)}: ${due[0].r.title}` : `Yaklaşan ${due.length} ödeme · ${money(total)}`,
      body: due.map((x) => `${label(x.days)}: ${x.r.title} ${money(x.r.amount)}`).join('\n'),
      tag: `cebim-${todayStr}`,
      url: '/'
    });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 12 * 3600 });
      sent++;
      await db.from('push_subscriptions').update({ last_sent_on: todayStr }).eq('endpoint', s.endpoint);
    } catch (err: any) {
      // Abonelik iptal edilmiş/silinmiş: pasife al
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.from('push_subscriptions').update({ active: false }).eq('endpoint', s.endpoint);
      } else {
        console.error('push failed', err?.statusCode, err?.body);
      }
    }
  }
  return { subscriptions: subs?.length ?? 0, sent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  try {
    if (action === 'prices') {
      return json(await prices(url.searchParams.get('debug') === '1'), 200, { 'Cache-Control': 'public, max-age=120' });
    }
    if (action === 'vapid') {
      return json({ publicKey: (await vapidKeys()).publicKey });
    }
    if (action === 'cron' && req.method === 'POST') {
      const key = await getSecret('cron_key');
      if (!key || req.headers.get('x-cron-key') !== key) return json({ error: 'forbidden' }, 403);
      return json(await runCron());
    }
    return json({ error: 'unknown action' }, 400);
  } catch (err: any) {
    console.error(err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

// Sesli işlem girişi: tarayıcının konuşma tanıma özelliğiyle Türkçe cümleyi yazıya çevirir
// ve "markette 250 lira harcadım" gibi bir cümleden işlem alanlarını çıkarır.
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVING_CATEGORIES } from '../data/initialData';
import type { PaymentMethod, TransactionType } from '../types/budget';

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon izni verin.',
  'service-not-allowed': 'Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon izni verin.',
  'no-speech': 'Ses algılanamadı. Tekrar deneyin.',
  'audio-capture': 'Mikrofon bulunamadı.',
  network: 'Konuşma tanıma için internet bağlantısı gerekiyor.'
};

export interface VoiceSession {
  stop: () => void;
}

// Tek bir cümle dinler; sonuç ya da hata geldiğinde ilgili geri çağırmayı bir kez çağırır.
export function listenOnce(
  onText: (text: string) => void,
  onError: (message: string) => void,
  onEnd: () => void
): VoiceSession | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError('Bu tarayıcı sesli girişi desteklemiyor. Android/masaüstünde Chrome kullanın.');
    onEnd();
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = 'tr-TR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;
  recognition.onresult = (e: any) => {
    const text = e.results?.[0]?.[0]?.transcript ?? '';
    if (text.trim()) onText(text.trim());
  };
  recognition.onerror = (e: any) => {
    if (e.error === 'aborted') return;
    onError(ERROR_MESSAGES[e.error] || 'Ses tanınamadı. Tekrar deneyin.');
  };
  recognition.onend = onEnd;
  recognition.start();
  return { stop: () => recognition.stop() };
}

// --- Cümleden işlem alanlarını çıkarma ---

const UNITS: Record<string, number> = {
  sıfır: 0, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9,
  on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90
};

// "iki bin beş yüz elli" -> 2550; tanınmayan kelimede null
function wordsToNumber(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let any = false;
  for (const w of words) {
    if (w in UNITS) {
      current += UNITS[w];
    } else if (w === 'yüz') {
      current = (current || 1) * 100;
    } else if (w === 'bin') {
      total += (current || 1) * 1000;
      current = 0;
    } else if (w === 'milyon') {
      total += (current || 1) * 1_000_000;
      current = 0;
    } else {
      return null;
    }
    any = true;
  }
  return any ? total + current : null;
}

const NUMBER_WORDS = new Set([...Object.keys(UNITS), 'yüz', 'bin', 'milyon']);

export function extractAmount(text: string): number | null {
  // Rakamlı tutar: "1.250,50", "1250.5", "2 bin", "1,5 milyon", "250"
  const pattern = /(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.](\d{1,2}))?\s*(bin|milyon)?(?!\d)/gi;
  const candidates = Array.from(text.matchAll(pattern)).map((m) => ({ m, after: text.slice((m.index ?? 0) + m[0].length).trimStart().toLocaleLowerCase('tr-TR') }));
  // Önce "lira/TL/₺" ile biten sayı; yoksa gram, adet, taksit gibi birim almayan ilk sayı
  const digit = (
    candidates.find((c) => /^(lira|tl|₺)/.test(c.after)) ||
    candidates.find((c) => !/^(gram|gr\b|adet|taksit|ay\b|kilo|kg|litre|tane)/.test(c.after))
  )?.m;
  if (digit) {
    const whole = Number(digit[1].replace(/[.\s]/g, ''));
    const fraction = digit[2] ? Number(`0.${digit[2]}`) : 0;
    const multiplier = digit[3]?.toLowerCase() === 'milyon' ? 1_000_000 : digit[3]?.toLowerCase() === 'bin' ? 1000 : 1;
    const value = (whole + fraction) * multiplier;
    if (value > 0) return Math.round(value * 100) / 100;
  }
  // Yazıyla tutar: "iki yüz elli lira"
  const tokens = text.toLocaleLowerCase('tr-TR').split(/[^a-zçğıöşü]+/).filter(Boolean);
  let best: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    if (!NUMBER_WORDS.has(tokens[i])) continue;
    let j = i;
    while (j < tokens.length && NUMBER_WORDS.has(tokens[j])) j++;
    const value = wordsToNumber(tokens.slice(i, j));
    if (value && (best === null || value > best)) best = value;
    i = j;
  }
  return best;
}

const SAVING_HINTS = ['birikim', 'biriktir', 'kenara', 'kumbara', 'altın aldım', 'döviz aldım', 'dolar aldım', 'euro aldım', 'yatırım yaptım', 'hesaba attım'];

const INCOME_HINTS = ['maaş', 'gelir', 'prim', 'ikramiye', 'kazandım', 'yattı', 'avans', 'temettü', 'faiz geldi', 'ödeme aldım', 'para aldım'];

const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ['Konut & Kira', ['kira']],
  ['Borç & Kredi', ['kredi', 'taksit', 'borç', 'kart borcu', 'ekstre']],
  ['Sigorta & Araç', ['sigorta', 'kasko', 'araç muayene', 'araba muayene', 'oto servis', 'araba', 'lastik']],
  ['Ulaşım & Motor', ['benzin', 'akaryakıt', 'yakıt', 'mazot', 'motorin', 'otobüs', 'taksi', 'metro', 'ulaşım', 'motor', 'otopark', 'köprü', 'otoyol', 'marmaray', 'dolmuş']],
  ['Faturalar & Aidat', ['fatura', 'elektrik', 'doğalgaz', 'doğal gaz', 'su parası', 'internet', 'aidat', 'telefon faturası']],
  ['Market & Gıda', ['market', 'ekmek', 'gıda', 'manav', 'kasap', 'bakkal', 'migros', 'bim', 'a101', 'şok', 'carrefour', 'süt', 'sebze', 'meyve', 'pazar']],
  ['Eğlence & Restoran', ['restoran', 'kafe', 'kahve', 'yemek', 'sinema', 'dışarıda', 'lokanta', 'döner', 'pizza', 'eğlence', 'tatil', 'netflix', 'spotify', 'youtube', 'disney', 'abonelik']],
  ['Sağlık & Bakım', ['eczane', 'ilaç', 'doktor', 'hastane', 'sağlık', 'kuaför', 'berber', 'diş', 'muayene']],
  ['Giyim & Alışveriş', ['kıyafet', 'giyim', 'ayakkabı', 'alışveriş', 'pantolon', 'mont', 'elbise', 'gömlek', 'çanta']],
  ['Konut & Birikim', ['birikim', 'altın', 'tasarruf']]
];

const INCOME_CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ['Maaş & Ücret', ['maaş', 'ücret', 'avans']],
  ['Ek Gelir & Prim', ['prim', 'ikramiye', 'ek gelir', 'ek iş', 'bonus']],
  ['Yatırım Geliri', ['faiz', 'temettü', 'yatırım', 'kira geliri', 'hisse', 'altın']]
];

const PAYMENT_KEYWORDS: Array<[PaymentMethod, string[]]> = [
  ['Nakit', ['nakit', 'elden', 'peşin']],
  ['Banka Kartı', ['banka kartı', 'bankamatik']],
  ['Havale/EFT', ['havale', 'eft', 'fast ile']],
  ['Kredi Kartı', ['kredi kartı', 'kartla', 'kart ile', 'karttan']]
];

function findByKeywords<T>(text: string, table: Array<[T, string[]]>): T | null {
  for (const [value, keywords] of table) {
    if (keywords.some((k) => text.includes(k))) return value;
  }
  return null;
}

export interface VoiceTransactionDraft {
  type: TransactionType;
  amount: number | null;
  category: string;
  paymentMethod: PaymentMethod | null;
  member: string | null;
  date: string;
  description: string;
}

function isoDate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}

export function parseVoiceTransaction(transcript: string, memberNames: string[]): VoiceTransactionDraft {
  const text = transcript.toLocaleLowerCase('tr-TR');
  // "kira geliri" gibi gelir ifadeleri, "kira" gider anahtar kelimesinden önce kontrol edilir
  const type: TransactionType = SAVING_HINTS.some((k) => text.includes(k))
    ? 'saving'
    : INCOME_HINTS.some((k) => text.includes(k)) || text.includes('kira geliri')
      ? 'income'
      : 'expense';

  // Ödeme yöntemi ifadeleri ("kredi kartıyla") kategoriyi yanıltmasın
  const categoryText = PAYMENT_KEYWORDS.flatMap(([, k]) => k).reduce((t, k) => t.split(k).join(' '), text);
  const category =
    type === 'saving'
      ? (text.includes('altın') ? 'Altın' : /dolar|euro|döviz/.test(text) ? 'Döviz' : text.includes('yatırım') ? 'Yatırım' : SAVING_CATEGORIES[0])
      : type === 'income'
        ? findByKeywords(categoryText, INCOME_CATEGORY_KEYWORDS) || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1]
        : findByKeywords(categoryText, CATEGORY_KEYWORDS) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

  const member =
    memberNames.find((name) => {
      const first = name.toLocaleLowerCase('tr-TR').split(/\s+/)[0];
      return first.length > 1 && text.includes(first);
    }) || null;

  const date = new Date();
  if (text.includes('evvelsi gün') || text.includes('önceki gün')) date.setDate(date.getDate() - 2);
  else if (text.includes('dün')) date.setDate(date.getDate() - 1);

  const description = transcript.charAt(0).toLocaleUpperCase('tr-TR') + transcript.slice(1);

  return {
    type,
    amount: extractAmount(transcript),
    category,
    paymentMethod: findByKeywords(text, PAYMENT_KEYWORDS),
    member,
    date: isoDate(date),
    description
  };
}

// Açıklamadan gider kategorisi tahmini (ekstre içe aktarma da kullanır)
export function guessExpenseCategory(text: string): string {
  return findByKeywords(text.toLocaleLowerCase('tr-TR'), CATEGORY_KEYWORDS) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

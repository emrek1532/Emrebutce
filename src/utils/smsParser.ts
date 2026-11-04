// Banka SMS'inden işlem taslağı: tutar, işyeri, tarih ve kart (yapay zekâsız, cihazda).
import type { CreditCardAccount } from '../types/budget';

export interface SmsDraft {
  type: 'expense' | 'income';
  amount: number | null;
  description: string;
  date: string;
  isCard: boolean;
  cardId?: string;
}

const fold = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

// Kart markası → banka
const BRANDS: [RegExp, string][] = [
  [/bonus/, 'garanti'],
  [/axess|wings/, 'akbank'],
  [/maximum|maximiles/, 'is'],
  [/world/, 'yapi'],
  [/paraf/, 'halk'],
  [/bankkart/, 'ziraat'],
  [/cardfinans|qnb/, 'finans'],
  [/advantage/, 'hsbc'],
  [/denizbank|bonus flexi/, 'deniz']
];

const toNumber = (raw: string) => {
  const s = raw.replace(/\s/g, '');
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  return Number(s);
};

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_m, sp: string, c: string) => sp + c.toUpperCase())
    .trim();

export function parseBankSms(text: string, cards: CreditCardAccount[]): SmsDraft {
  const t = text.replace(/\s+/g, ' ').trim();
  const f = fold(t);

  // Tutar: "345,60 TL", "TL 345,60", "1.250,00 TRY"
  const amountMatch =
    t.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:TL|TRY|₺)/i) ||
    t.match(/(?:TL|TRY|₺)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i);
  const amount = amountMatch ? toNumber(amountMatch[1]) : null;

  // Tarih: 12/11/2026, 12.11.2026, 12-11-26
  const d = t.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  let date = new Date().toISOString().slice(0, 10);
  if (d) {
    const y = d[3].length === 2 ? `20${d[3]}` : d[3];
    const candidate = `${y}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
    if (!Number.isNaN(Date.parse(candidate))) date = candidate;
  }

  const income = /(hesabiniza|hesabina).*(yatirildi|gelmistir|aktarildi|gecmistir)|gelen (eft|havale|fast)|maas/.test(f) && !/harcama/.test(f);

  // İşyeri: "... MIGROS ISTANBUL isyerinden/işyerinde ...", "SHELL'den", "A101 MAGAZA'dan"
  let merchant = '';
  const kw = t.search(/\s(?:üye\s+)?(?:işyerinden|isyerinden|işyerinde|isyerinde)\b/i);
  if (kw > 0) {
    // Anahtar kelimeden geriye doğru en fazla 4 kelime; "tarihinde", "ile", tarih gibi kelimelerde durulur
    const words = t.slice(0, kw).split(' ');
    const picked: string[] = [];
    for (let k = words.length - 1; k >= 0 && picked.length < 4; k--) {
      const w = words[k];
      if (/^(tarihinde|ile|kart[ıi]n[ıi]zla|kart[ıi]n[ıi]zdan|kart[ıi]n[ıi]z|saat|\d{1,2}[:.]\d{2})$/i.test(w) || /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(w)) break;
      picked.unshift(w);
    }
    merchant = picked.join(' ');
  } else {
    const m2 = t.match(/([A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9 .&*\-]{1,40}?)'(?:dan|den|tan|ten|da|de|ta|te)\b/);
    if (m2) merchant = m2[1];
  }
  merchant = merchant.replace(/\s{2,}/g, ' ').trim();
  const description = merchant ? titleCase(merchant) : income ? (/maas/.test(f) ? 'Maaş' : 'Gelen para') : 'Kart harcaması';

  const isCard = /kart/.test(f);
  // Kart: SMS'teki banka/marka adı kartın banka ya da adıyla eşleşirse
  let cardId: string | undefined;
  if (isCard) {
    const bankWords = BRANDS.filter(([re]) => re.test(f)).map(([, b]) => b);
    const card = cards.find((c) => {
      const name = fold(`${c.bank} ${c.name}`);
      return name.split(/\s+/).some((w) => w.length >= 4 && f.includes(w)) || bankWords.some((b) => name.includes(b));
    });
    cardId = card?.id ?? (cards.length === 1 ? cards[0].id : undefined);
  }

  return { type: income ? 'income' : 'expense', amount, description, date, isCard, cardId };
}

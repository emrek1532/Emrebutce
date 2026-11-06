// Kredi kartı / banka ekstresi PDF'inden harcama satırlarını çıkarır. Yapay zekâ kullanılmaz:
// PDF yazısı cihazda okunur (pdf.js), "tarih … açıklama … tutar" biçimindeki satırlar kurallarla ayrılır.
import { guessExpenseCategory } from './voiceTransaction';

const PDFJS = '/vendor/pdfjs-4.10.38/pdf.min.mjs';
const PDFJS_WORKER = '/vendor/pdfjs-4.10.38/pdf.worker.min.mjs';

export interface StatementLine {
  key: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  // Karta ödeme, iade, faiz gibi harcama olmayan satırlar varsayılan olarak seçilmez
  likelyNotExpense: boolean;
  category: string;
  installment?: { current: number; total: number };
}

// PDF'in her sayfasındaki yazıları satır satır döndürür
export async function pdfLines(file: File, password?: string): Promise<string[]> {
  const pdfjs: any = await import(/* @vite-ignore */ PDFJS);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password }).promise;
  const lines: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // Aynı yükseklikteki (y) parçalar bir satırdır
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const row = rows.get(y) ?? [];
      row.push({ x: item.transform[4], s: item.str });
      rows.set(y, row);
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, row]) => lines.push(row.sort((a, b) => a.x - b.x).map((r) => r.s.trim()).join(' ')));
  }
  return lines;
}

const DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/;
// "30 Eylül 2026" gibi ay adlı tarih (Garanti vb.)
const MONTH_NAMES = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const DATE_NAMED = /^(\d{1,2})\s+(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)\s+(\d{4})\b/i;
const ASCII_MONTH: Record<string, string> = { subat: 'şubat', mayis: 'mayıs', agustos: 'ağustos', eylul: 'eylül', kasim: 'kasım', aralik: 'aralık' };

function matchDate(line: string): { len: number; y: number; m: number; d: number } | null {
  const a = line.match(DATE);
  if (a) return { len: a[0].length, d: Number(a[1]), m: Number(a[2]), y: a[3].length === 2 ? 2000 + Number(a[3]) : Number(a[3]) };
  const b = line.match(DATE_NAMED);
  if (b) {
    const name = b[2].toLocaleLowerCase('tr-TR');
    return { len: b[0].length, d: Number(b[1]), m: MONTH_NAMES.indexOf(ASCII_MONTH[name] ?? name) + 1, y: Number(b[3]) };
  }
  return null;
}
// Tutar hem Türkçe (1.213,86) hem İngilizce (1,213.86 — İş Bankası) biçiminde olabilir
const AMOUNT = /(-|\+)?\s?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*(TL|₺|TRY)?\s*(-|\+|B|A)?\s*$/i;

/** "1.213,86" ve "1,213.86" → 1213.86 (son ayraçtan sonraki iki hane küsurattır) */
export function parseAmount(s: string): number {
  const t = s.trim();
  const dec = t.slice(-3, -2);
  const int = t.slice(0, -3).replace(/[.,]/g, '');
  return Number(`${int}.${t.slice(-2)}`) * (dec === '.' || dec === ',' ? 1 : NaN);
}
const NOT_EXPENSE = /(ödeme|odeme|tahsilat|iade|önceki dönem|onceki donem|devreden|faiz|kdv|bsmv|ekstre|toplam|asgari|limit|bonus|puan|kazan)/i;

// Bankaların ekstrede harcamaları grupladığı başlıklar → kategori
const SECTION_HINTS: Array<[RegExp, string]> = [
  [/akaryak|benzin|oto bak|otomotiv|ulaşım|ulasim/i, 'Ulaşım & Motor'],
  [/cafe|restoran|restaurant|yeme.?içme|eğlence|eglence/i, 'Eğlence & Restoran'],
  [/süpermarket|supermarket|market|gıda|gida|pastane|fırın|firin/i, 'Market & Gıda'],
  [/giyim|aksesuar|ayakkabı/i, 'Giyim & Alışveriş'],
  [/sağlık|saglik|eczane|kozmetik/i, 'Sağlık & Bakım'],
  [/fatura|telekom|iletişim|iletisim|elektrik|doğalgaz/i, 'Faturalar & Aidat'],
  [/sigorta/i, 'Sigorta & Araç']
];

// Açıklamadaki işyeri adından ek ipuçları
const MERCHANT_HINTS: Array<[RegExp, string]> = [
  [/petrol|opet|shell|\bbp\b|total|aytemiz|po\b|otomot/i, 'Ulaşım & Motor'],
  [/akedas|enerjisa|bedaş|bedas|ck enerji|turkcell|vodafone|türk telekom|superonline|igdaş|igdas|aski|doğalgaz/i, 'Faturalar & Aidat'],
  [/kart ücret|kart ucret|faiz|kkdf|bsmv/i, 'Borç & Kredi']
];

export function parseStatementLines(lines: string[]): StatementLine[] {
  const out: StatementLine[] = [];
  // İşaret kuralı bankaya göre değişir: Garanti'de harcama işaretsiz, ödeme "+"; İş Bankası'nda harcama "-", ödeme "+".
  // Tarihli satırların çoğu "-" ile bitiyorsa "-" harcama demektir.
  const suffix = (l: string) => l.replace(/\s+/g, ' ').trim().match(AMOUNT)?.[4];
  const dated = lines.filter((l) => matchDate(l.replace(/\s+/g, ' ').trim()));
  const minusCount = dated.filter((l) => suffix(l) === '-').length;
  const minusIsDebit = minusCount > 0 && minusCount >= dated.filter((l) => suffix(l) === '+').length;
  const seen = new Map<string, number>();
  let sectionCategory: string | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const d = matchDate(line);
    const a = line.match(AMOUNT);
    if (!d) {
      // Tarihsiz kısa satır bir bölüm başlığı olabilir ("Akaryakıt", "Süpermarket", "DİĞER HARCAMALARINIZ")
      if (line.length < 60 && !a) {
        const hint = SECTION_HINTS.find(([re]) => re.test(line));
        if (hint) sectionCategory = hint[1];
        else if (/harcamalar/i.test(line)) sectionCategory = null;
      }
      continue;
    }
    if (!a) continue;
    const year = d.y;
    const month = d.m;
    const day = d.d;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const amount = parseAmount(a[2]);
    if (!(amount > 0)) continue;
    let description = line.slice(d.len, line.length - a[0].length).trim();
    // Açıklamanın başında ikinci bir tarih (işlem/valör) varsa at
    const second = matchDate(description);
    if (second) description = description.slice(second.len).trim();
    description = description
      // Taksitli satırda toplam tutar ("5,399.97 TL"), puan bilgisi, maskeli kart no ve sondaki ülke kodu
      .replace(/\s+\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\s*(TL|₺|TRY)\s*$/i, '')
      .replace(/\s*KAZANILAN\s+\S*PUAN\S*\s*:?\s*[\d.,]*/gi, '')
      .replace(/\s*\d{4}\*+\d{4}/g, '')
      .replace(/\s+TR$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    description = description || 'Kart harcaması';
    // Karta yapılan ödeme/iade (alacak): Garanti'de "+" ya da "-", İş Bankası'nda "+"
    const negative = minusIsDebit
      ? a[4] === '+' || a[1] === '+' || /^[A]$/i.test(a[4] ?? '')
      : a[1] === '-' || a[4] === '-' || a[4] === '+' || /^[A]$/i.test(a[4] ?? '');
    const inst = description.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(taksit|tks)?/i);
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const base = `${date}|${description}|${amount}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.push({
      key: `${base}|${n}`,
      date,
      description,
      amount,
      likelyNotExpense: negative || NOT_EXPENSE.test(description),
      category: MERCHANT_HINTS.find(([re]) => re.test(description))?.[1] ?? sectionCategory ?? guessExpenseCategory(description),
      installment:
        inst && Number(inst[2]) > 1 && Number(inst[1]) <= Number(inst[2]) ? { current: Number(inst[1]), total: Number(inst[2]) } : undefined
    });
  }
  return out;
}

// ---------- Ekstre özeti (dönem borcu, asgari, tarihler, limit) ----------
export interface StatementSummary {
  statementDate?: string; // hesap kesim (YYYY-MM-DD)
  dueDate?: string; // son ödeme (YYYY-MM-DD)
  statementDebt?: number; // dönem borcu
  minimumPayment?: number;
  limit?: number;
  // Ekstredeki taksitli işlemlerin henüz gelmemiş taksitleri toplamı
  futureInstallments?: number;
  bankHint?: string; // PDF'te geçen banka adı
}

const toAmount = parseAmount;
const AMT = '(\\d{1,3}(?:[.,]\\d{3})*[.,]\\d{2})';
const DATE_ANY = '(\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}|\\d{1,2}\\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\\s+\\d{4})';

function dateFrom(text: string): string | undefined {
  const d = matchDate(text.trim());
  return d && d.m >= 1 ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : undefined;
}

export function parseStatementSummary(lines: string[]): StatementSummary {
  const text = lines.join('\n');
  const find = (labels: string[], value: string) => {
    for (const label of labels) {
      const m = text.match(new RegExp(`${label}\\s*:?\\s*${value}`, 'i'));
      if (m) return m[1];
    }
    return undefined;
  };
  const debt = find(['Dönem Borcunuz', 'Dönem Borcu', 'Toplam Borcunuz', 'Hesap Özeti Borcu', 'Ekstre Borcu'], AMT);
  const min = find(['Min\\.? Ödeme Tutarı', 'Minimum Ödeme Tutarı', 'Asgari Ödeme Tutarı', 'Min\\.? Ödeme Tutarınız', 'Ödenmesi Gereken Asgari Tutar'], AMT);
  const limit = find(['Kart Limiti', 'Kredi Kartı Limiti', 'Toplam Limit'], AMT);
  const cut = find(['Hesap Kesim Tarihi', 'Ekstre Kesim Tarihi', 'Hesap Özeti Tarihi'], DATE_ANY);
  const due = find(['Son Ödeme Tarihi'], DATE_ANY);
  const bank = text.match(/garanti|yapı kredi|yapi kredi|akbank|iş ?bank|isbank|ziraat|halkbank|vakıf|vakif|qnb|finansbank|enpara|denizbank|ing\b|teb\b|kuveyt|albaraka/i)?.[0];
  return {
    statementDebt: debt ? toAmount(debt) : undefined,
    minimumPayment: min ? toAmount(min) : undefined,
    limit: limit ? toAmount(limit) : undefined,
    statementDate: cut ? dateFrom(cut) : undefined,
    dueDate: due ? dateFrom(due) : undefined,
    bankHint: bank
  };
}

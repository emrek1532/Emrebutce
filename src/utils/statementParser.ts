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
const AMOUNT = /(-|\+)?\s?(\d{1,3}(?:\.\d{3})*,\d{2})\s*(TL|₺|TRY)?\s*(-|\+|B|A)?\s*$/i;
const NOT_EXPENSE = /(ödeme|odeme|tahsilat|iade|önceki dönem|onceki donem|devreden|faiz|kdv|bsmv|ekstre|toplam|asgari|limit|bonus|puan|kazan)/i;

export function parseStatementLines(lines: string[]): StatementLine[] {
  const out: StatementLine[] = [];
  const seen = new Map<string, number>();
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const d = line.match(DATE);
    const a = line.match(AMOUNT);
    if (!d || !a) continue;
    const year = d[3].length === 2 ? 2000 + Number(d[3]) : Number(d[3]);
    const month = Number(d[2]);
    const day = Number(d[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const amount = Number(a[2].replace(/\./g, '').replace(',', '.'));
    if (!(amount > 0)) continue;
    let description = line.slice(d[0].length, line.length - a[0].length).trim();
    // Açıklamanın başında ikinci bir tarih (işlem/valör) varsa at
    description = description.replace(DATE, '').trim() || 'Kart harcaması';
    const negative = a[1] === '-' || a[4] === '-' || /^[A]$/i.test(a[4] ?? '');
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
      category: guessExpenseCategory(description),
      installment:
        inst && Number(inst[2]) > 1 && Number(inst[1]) <= Number(inst[2]) ? { current: Number(inst[1]), total: Number(inst[2]) } : undefined
    });
  }
  return out;
}

// Küçük .xlsx okuyucu: dosya bir zip arşividir; içindeki sayfa XML'lerini tarayıcının kendi
// sıkıştırma çözücüsüyle (DecompressionStream) açar. Ek kütüphane gerektirmez.

export type Cell = string | number | null;
export type Sheets = Record<string, Cell[][]>;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // Merkezi dizin sonu kaydını sondan geriye doğru ara
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Dosya bir Excel (.xlsx) dosyası değil.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = bytes.subarray(start, start + compSize);
    files.set(name, method === 0 ? raw : await inflateRaw(raw));
  }
  return files;
}

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');

// <si> içindeki tüm <t> parçalarını birleştirir (biçimli yazılar birden çok parçadan oluşur)
const textOf = (xml: string) => Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (m) => unescapeXml(m[1])).join('');

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsx(file: Blob): Promise<Sheets> {
  const files = await unzip(await file.arrayBuffer());
  const dec = new TextDecoder();
  const read = (name: string) => {
    const f = files.get(name);
    return f ? dec.decode(f) : '';
  };

  const shared = Array.from(read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g), (m) => textOf(m[1]));

  // Sayfa adı → dosya yolu
  const rels = new Map<string, string>();
  for (const m of read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const target = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const sheets: Sheets = {};
  for (const m of read('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = unescapeXml(m[0].match(/name="([^"]+)"/)?.[1] ?? '');
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1] ?? '';
    const path = rels.get(rid);
    if (!name || !path) continue;
    const rows: Cell[][] = [];
    for (const row of read(path).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const rowNum = Number(row[0].match(/<row\b[^>]*\br="(\d+)"/)?.[1] ?? rows.length + 1) - 1;
      const cells: Cell[] = [];
      for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const inner = c[2] ?? '';
        const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1] ?? '';
        const type = attrs.match(/\bt="([^"]+)"/)?.[1];
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let value: Cell = null;
        if (type === 's' && v !== undefined) value = shared[Number(v)] ?? null;
        else if (type === 'inlineStr') value = textOf(inner);
        else if (type === 'str' || type === 'b' || type === 'e') value = v !== undefined ? unescapeXml(v) : null;
        else if (v !== undefined) value = Number(v);
        cells[ref ? colIndex(ref) : cells.length] = value;
      }
      rows[rowNum] = Array.from(cells, (x) => (x === undefined ? null : x));
    }
    sheets[name] = Array.from(rows, (r) => r ?? []);
  }
  return sheets;
}

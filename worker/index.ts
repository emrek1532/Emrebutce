// Cebim sunucu işçisi: /api/* isteklerini karşılar, gerisi statik site (dist).
// /api/ask: "Bu ay arkadaş kartlarına ne kadar ödeyeceğim?" gibi soruları yanıtlar.
// Gizlilik: telefon yalnızca soruyla ilgili kalemlerin adını/tutarını gönderir; burada saklanmaz.
// Doğruluk: yapay zekâ sadece hangi kalemlerin ve hangi ölçünün (bu ay ödenecek, kalan borç…)
// sorulduğunu seçer; toplamı telefon kesin olarak hesaplar.

interface Env {
  AI?: { run: (model: string, input: unknown) => Promise<any> };
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const METRICS = ['buAy', 'gelecekAy', 'kalanToplam', 'asgari', 'kalanLimit', 'tutar', 'bitis', 'yok'] as const;

const SCHEMA = {
  type: 'object',
  properties: {
    ids: { type: 'array', items: { type: 'string' } },
    metric: { type: 'string', enum: METRICS },
    intro: { type: 'string' },
    note: { type: 'string' }
  },
  required: ['ids', 'metric', 'intro']
};

const PROMPT = `Bir aile bütçe uygulamasının soru asistanısın. Kullanıcı Türkçe bir soru soruyor; sana uygulamadaki kalemleri JSON listesi olarak veriyorum.
Kalem türleri (tur): "taksit" (kredi, Eminevim, arkadaş kartı taksiti vb.), "kart" (kredi kartı), "duzenli-gider", "duzenli-gelir", "islem" (girilmiş harcama/gelir).
Alanlar: ad, alacakli (borcun kime/hangi bankaya/kimin kartına olduğu), not, kimin, kategori, tarih, yontem.
Görevin HESAP YAPMAK DEĞİL: soruyla ilgili kalemlerin id'lerini ve hangi ölçünün istendiğini seçmek. Toplamı uygulama hesaplar.
Ölçüler (metric):
- buAy: bu ay ödenecek tutar (taksitin bu ayki taksiti, kartın ekstreden kalan borcu, düzenli giderin aylık tutarı); kalemde buAyOdendi=true ise bu ayki ödeme yapılmıştır (uygulama 0 sayar), yine de soruyla ilgiliyse seç
- gelecekAy: gelecek ay ödenecek taksit
- kalanToplam: kalan toplam borç (taksitin bitene kadarki toplamı, kartın tüm borcu)
- asgari: kartın kalan asgari ödemesi
- kalanLimit: kartın kalan limiti
- tutar: işlemlerin tutarı (harcama/gelir toplamı) veya düzenli gelirin tutarı
- bitis: borcun bitiş tarihi (listeleme)
- yok: soru bu verilerle cevaplanamıyorsa
Kurallar:
- Soruda geçen isimleri ad, alacakli, not ve kimin alanlarında ara; Türkçe ekleri dikkate al ("arkadaş kartlarına" = alacaklı/notunda "arkadaş" geçen taksitler, "Garanti'ye" = Garanti kartı/taksiti).
- "Bu ay ne kadar ödeyeceğim" → buAy; "toplam borcum/kalan borcum" → kalanToplam; "ne harcadım" → tutar (tur=islem, harcama).
- Sadece gerçekten ilgili kalemleri seç; emin değilsen az değil, ilgili hepsini seç.
- intro: cevabın başına gelecek kısa Türkçe cümle (sayı yazma), ör. "Bu ay arkadaş kartı taksitlerine ödeyeceğiniz toplam".
- note: gerekirse kısa açıklama (ör. hangi kalemi neden dahil etmedin). Sadece JSON döndür.`;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function handleAsk(req: Request, env: Env): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.AI) return json({ error: 'no_ai', message: 'Yapay zekâ bu sunucuda tanımlı değil.' }, 503);
  const raw = await req.text();
  if (raw.length > 60000) return json({ error: 'too_large' }, 413);
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const question = String(body?.question || '').trim().slice(0, 300);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 400) : [];
  if (!question) return json({ error: 'empty' }, 400);
  try {
    const r = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Bugün: ${String(body?.today || '').slice(0, 10)}\nSoru: ${question}\nKalemler: ${JSON.stringify(items)}` }
      ],
      response_format: { type: 'json_schema', json_schema: SCHEMA },
      max_tokens: 800,
      temperature: 0
    });
    const out = typeof r?.response === 'string' ? JSON.parse(r.response) : r?.response;
    const metric = METRICS.includes(out?.metric) ? out.metric : 'yok';
    return json({
      ids: Array.isArray(out?.ids) ? out.ids.map(String).slice(0, 200) : [],
      metric,
      intro: String(out?.intro || '').slice(0, 200),
      note: String(out?.note || '').slice(0, 300)
    });
  } catch (err) {
    return json({ error: 'ai', message: String((err as Error)?.message || err).slice(0, 200) }, 502);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/ask') return handleAsk(req, env);
    return env.ASSETS.fetch(req);
  }
};

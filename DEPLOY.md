# Yayına Alma: Cloudflare + Supabase

Uygulama Cloudflare'de statik site olarak yayınlanır; şifreli bulut eşitleme
Supabase üzerinde çalışır. Veriler tarayıcıda şifrelenir, Supabase yalnızca
şifreli metni saklar.

## 1. Supabase (kuruldu)

`supabase/migrations/20261022000000_encrypted_vaults.sql` dosyası
Ailve'ye özel **ailve-butce** projesine (Frankfurt) uygulandı; diğer projelerden tamamen ayrıdır:

- `encrypted_vaults` tablosu (RLS açık, doğrudan erişim kapalı)
- `get_vault` ve `upsert_vault` RPC fonksiyonları (anonim çağrılabilir)

Bağlantı bilgileri (herkese açık olması güvenli olan publishable anahtar):

```
VITE_SUPABASE_URL=https://ssrurizfftncqgwqiijk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxI8Tu9BPMu0a1kVZgFUYA_mUwhiDet
```

## 2. Cloudflare

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** →
   **Import a repository** → GitHub'dan `emrebutce` deposunu seçin.
2. Ayarlar:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
3. **Settings → Build → Variables and secrets** bölümüne yukarıdaki iki
   `VITE_SUPABASE_*` değişkenini ekleyin (derleme sırasında koda gömülürler).
4. **Deploy**. Site `https://emrebutce.<hesabınız>.workers.dev` adresinde
   açılır. Kendi alan adınızı **Settings → Domains & Routes** bölümünden
   bağlayabilirsiniz.

`wrangler.jsonc`, `dist` klasörünü sunar ve tüm bilinmeyen yolları
`index.html`'e yönlendirir (SPA). `public/_headers` service worker ve
manifest başlıklarını ayarlar.

## Yerel geliştirme

`.env` dosyasına `VITE_SUPABASE_*` değişkenlerini eklerseniz yerelde de
Supabase kullanılır. Boş bırakırsanız `npm run dev` ile çalışan Express
sunucusundaki `/api/sync` kullanılmaya devam eder.

## Paylaşım

Uygulamadaki "Telefona Gönder / QR" özelliği bağlantıyı
`window.location.origin` üzerinden ürettiği için, Cloudflare adresinde
açıldığında otomatik olarak doğru paylaşım linki oluşur.

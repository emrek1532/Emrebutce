# Cebim — aile bütçesi uygulaması

Kullanıcıyla Türkçe, kısa yazış; yapılan işi ve geçen kavramları sade Türkçe açıkla.
Yayın: dalı `origin/main`'den aç, commit, PR, squash ile birleştir (Cloudflare Worker `emrebutce` main'den otomatik yayınlanır).

## Sürüm (her güncellemede zorunlu)
Uygulamaya giren her değişiklikte sürümü artır:
- `package.json` → `"version"`: hata düzeltmesi 1.1.**1**, yeni özellik 1.**2**.0, büyük değişiklik **2**.0.0
- `CHANGELOG.md` en üstüne `## x.y.z — tarih` başlığı ve 1-3 maddelik not ekle
- Test (`tests/version.test.ts`) ikisinin aynı olduğunu kontrol eder; `npm test` geçmeden PR açma.
Yalnızca belge/test değişikliğinde sürüm artırılmaz.

## Kullanım kılavuzu
Uygulama içi kılavuz `src/components/views/GuideView.tsx`. Para akışını (neyin nereye girildiği, hangi rakamın nasıl hesaplandığı) değiştiren her güncellemede kılavuzu da güncelle.

## Kontroller
`npm run lint` (tsc) ve `npm test` geçmeli.

## Kurallar
- Supabase SQL'inde DELETE/DROP yazma; gerekiyorsa SQL'i kullanıcıya ver.
- Kullanıcının PDF'lerini, ekstrelerini ve kişisel verilerini repoya koyma; testlerde uydurma satır kullan.

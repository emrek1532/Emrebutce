# Sürüm notları

Sürüm numarası `package.json` → `"version"` alanındadır ve uygulamada sol menünün altında (telefonda sağ üstte) görünür.
Yeni sürümde bu alanı ve aşağıdaki listeyi güncelleyin: hata düzeltmesi → 1.1.**1**, yeni özellik → 1.**2**.0, büyük değişiklik → **2**.0.0.

## 1.6.1 — 14 Kasım 2026
- Düzeltme: Borçlar'dan "Bu ayı öde" ile ödenen taksitler (yöntemi Kredi Kartı görünse de) yeniden Kalan Bakiye'den düşer; 1.4.3'te bu ödemeler sayılmıyordu ve bakiye fazla görünüyordu

## 1.6.0 — 14 Kasım 2026
- Referans tasarıma uygun lacivert masaüstü menüsü ve açık renkli ana sayfa
- Ana sayfa grafikleri yan yana, yaklaşan ödemeler ve son işlemler alt sırada
- Masaüstü başlıkları, mobil menü ve işlem düğmesi görsel olarak yenilendi
- Mevcut bütçe verileri ve hesaplamaları değiştirilmedi

## 1.5.0 — 14 Kasım 2026
- Ana sayfa finansal özet kartları baştan tasarlandı: mavi ana kart, açık renkli gelir/gider/bakiye kartları
- Mobil ve masaüstünde daha belirgin tutarlar, yeni kart boşlukları ve dokunmatik etkileşimler
- Mevcut finansal kayıtlar ve hesaplama mantığı korunur

## 1.4.3 — 13 Kasım 2026
- Nakit akışı, yedek geri yükleme, düzenli gelir ve eşitleme güvenliği düzeltmeleri
- Otomatik testler ve bağımlılık uyumluluğu iyileştirmeleri

## 1.4.2 — 9 Kasım 2026
- iPhone: alt menü ve açılan pencereler ana ekran çubuğunun üstünde kalır (viewport-fit=cover + güvenli alan boşlukları); üst çubuk çentiğe göre ayarlı

## 1.4.1 — 9 Kasım 2026
- Yeni sürüm yayındaysa üstte "Yeni sürüm hazır → Güncelle" çıkar; Diğer menüsünde (bilgisayarda sürüm yazısında) "Güncellemeleri denetle"
- Güncelle: önbelleği temizler ve uygulamayı yeniden yükler (veriler korunur)

## 1.4.0 — 9 Kasım 2026
- Dokunulabilir arayüz: Özet kutuları, kategori/kişi satırları ve "geçen aya göre" ilgili işlemleri filtreli açar; Yaklaşan Ödemeler'de taksit için "Öde"
- Kredi kartına dokununca detay penceresi: borç, limit, asgari, hızlı ödeme (asgari / ekstrenin tamamı / başka tutar), ekstre yükleme, düzenleme, son harcamalar
- Taksit, düzenli gider ve işlem satırına dokununca düzenleme açılır

## 1.3.0 — 9 Kasım 2026
- Kullanım Kılavuzu (Diğer menüsü / sol menü): neyi nereye girmeli, rakamlar nasıl hesaplanır, aylık rutin, sık sorulanlar
- Kart borcu ödemesi harcama dağılımlarında (kategori, kişi, sınır, Akıllı Öneri) artık iki kez sayılmıyor
- Yeni harcamada kategori varsayılanı "Diğer" (önceden "Konut & Kira" fark edilmeden seçili kalıyordu); açıklamadan kategori tahmini
- Kartla taksitli alışveriş için "Taksit" seçimi; kart borcunu Yeni İşlem ile girmeye karşı uyarı; geçmiş ay sonucunda taksitli kart harcamaları nakit sayılmıyor

## 1.2.5 — 9 Kasım 2026
- Kart düzenleme: "Bankadaki kullanılabilir limit" artık iki yönde eşitler; uygulama bankadan fazla düşmüşse fark "banka farkı" olarak geri eklenir

## 1.2.4 — 9 Kasım 2026
- İşlemler/Raporlar üst şeridi Özet ile aynı: Gelir · Gider (hesaptan) · Kartla (önceden gider kart dahil gösteriliyordu, rakamlar tutmuyor gibiydi)
- "Geçen aya göre" kartında toplamın kart dahil olduğu yazıyor

## 1.2.3 — 9 Kasım 2026
- "Bu ay harcayabileceğin" artık elindeki para + gelecek gelir − bekleyen ödemeler olarak hesaplanır
- Ödeme yapınca (ör. "Bu ayı öde") elindeki para ve bekleyen ödemeler birlikte azalır; kartla eşleşen taksitlerin nakit ödemesi de düşer

## 1.2.2 — 9 Kasım 2026
- Borçlar: üst kutular "bu ay kalan" tutarı gösterir; "Bu ayı öde" denen taksitler ve günü geçmiş düzenli giderler düşülür
- Bütçene sor: "bu ay ne kadar ödeyeceğim" sorusunda bu ay ödenmiş taksitler toplama girmez, ayrıca belirtilir

## 1.2.1 — 9 Kasım 2026
- Kart: kalan limitin hesabı kartın üstünde açıkça yazıyor (limit − borç − gelmemiş taksit)
- Kart düzenleme: "Bankadaki kullanılabilir limit" girilirse uygulama bankayla birebir eşitlenir
- Yeni harcamada en son kullanılan kart seçili gelir (önceden hep ilk kart geliyordu)

## 1.2.0 — 9 Kasım 2026
- Telefon: sekmeler alt menüye taşındı; Birikim, Linki Paylaş, Eşitleme & Yedek ve tema "Diğer" menüsünde
- Telefon: üst çubukta yalnızca sürüm ve bildirim
- Özet kutularında alt yazının kesilmesi düzeltildi

## 1.1.0 — 9 Kasım 2026
- Yeni panel düzeni: sol menü, renkli özet kutuları, Aylık Özet, Akıllı Öneri, hedef şeridi
- Ekstre okuma: Garanti, İş Bankası ve Denizbank biçimleri; gelecek taksitler kullanılabilir limitten düşer
- Tablet ve dar ekran görünüm düzeltmeleri

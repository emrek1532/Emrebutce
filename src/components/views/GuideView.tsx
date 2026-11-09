import React from 'react';
import { setActiveTab } from '../../utils/activeTab';
import {
  BookOpen,
  ChevronDown,
  CreditCard,
  Landmark,
  ListChecks,
  PiggyBank,
  Calculator,
  HelpCircle,
  Rocket,
  ArrowLeftRight
} from 'lucide-react';

// Kullanım kılavuzu: neyin nereye girileceği, hangi rakamın nasıl hesaplandığı, aylık rutin ve sık sorulanlar
const Section: React.FC<{ icon: React.ReactNode; title: string; open?: boolean; children: React.ReactNode }> = ({ icon, title, open, children }) => (
  <details open={open} className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
    <summary className="list-none cursor-pointer flex items-center justify-between gap-3 p-4 sm:p-5">
      <span className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
        {icon}
        {title}
      </span>
      <ChevronDown className="w-4 h-4 text-neutral-400 transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-4 sm:px-5 pb-5 text-sm text-neutral-700 dark:text-neutral-300 space-y-3 leading-relaxed">{children}</div>
  </details>
);

const Row: React.FC<{ what: string; where: string; effect: string }> = ({ what, where, effect }) => (
  <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-3">
    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{what}</p>
    <p className="text-xs mt-1">
      <span className="font-semibold text-sky-700 dark:text-sky-400">Nereye: </span>
      {where}
    </p>
    <p className="text-xs mt-0.5">
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Ne olur: </span>
      {effect}
    </p>
  </div>
);

const Formula: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3">
    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{name}</p>
    <p className="text-xs mt-1">{children}</p>
  </div>
);

const Go: React.FC<{ tab: Parameters<typeof setActiveTab>[0]; children: React.ReactNode }> = ({ tab, children }) => (
  <button type="button" onClick={() => setActiveTab(tab)} className="font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted">
    {children}
  </button>
);

export const GuideView: React.FC = () => (
  <div className="space-y-3 max-w-3xl">
    <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-sky-500 to-indigo-700 shadow-sm">
      <p className="flex items-center gap-2 text-lg font-extrabold">
        <BookOpen className="w-5 h-5" /> Cebim nasıl kullanılır?
      </p>
      <p className="text-sm text-white/85 mt-1">
        Altın kural: <b>her parayı bir kez gir.</b> Kartla yaptığın harcama karttan, kart borcunu ödemen "Borç Öde"den, taksit ödemen
        "Bu ayı öde"den girilir. Böylece hiçbir şey iki kez sayılmaz.
      </p>
    </div>

    <Section icon={<Rocket className="w-5 h-5 text-sky-600" />} title="1. İlk kurulum (bir kez)" open>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>
          <b>Kartlarını ekle</b> (<Go tab="cards">Kartlar</Go> → Kart Ekle): banka, limit, güncel borç, ekstre kesim ve son ödeme günü. Kalan
          limit tutmazsa düzenle → "Bankadaki kullanılabilir limit"e bankadaki rakamı yaz.
        </li>
        <li>
          <b>Maaş ve düzenli giderleri ekle</b> (<Go tab="installments">Borçlar</Go> → Düzenli Gelir & Giderler): maaş, kira, aidat, fatura,
          abonelik. Günü gelince her ay kendiliğinden işlenir.
        </li>
        <li>
          <b>Kredileri ve taksitleri ekle</b> (<Go tab="installments">Borçlar</Go> → Taksit Ekle): banka kredisi, arkadaş kartı taksiti,
          Eminevim. Aylık tutar, toplam taksit, ödenen taksit ve ödeme günü.
        </li>
        <li>
          <b>Birikimlerini ekle</b> (<Go tab="goals">Birikim</Go> → Varlık Ekle): altın, döviz, TL. Değeri güncel fiyatla hesaplanır.
        </li>
        <li>
          <b>Son ekstreleri yükle</b> (<Go tab="cards">Kartlar</Go> → Ekstre PDF'i yükle): harcamalar, kart borcu, asgari ve gelmemiş taksitler
          gelir.
        </li>
        <li>
          <b>Eşini bağla</b> (Diğer → Linki Paylaş): aynı bütçeyi iki telefondan görürsünüz.
        </li>
      </ol>
    </Section>

    <Section icon={<ArrowLeftRight className="w-5 h-5 text-sky-600" />} title="2. Hangi işlem nereye girilir?">
      <Row what="Nakit, banka kartı ya da havale ile harcama" where="+ (Yeni İşlem) → Gider → ödeme: Nakit / Havale/EFT" effect="Hemen Gider'e eklenir, Kalan Bakiye'den düşer." />
      <Row
        what="Kredi kartıyla harcama"
        where="+ → Gider → ödeme: Kredi Kartı → kartı seç"
        effect="Kartın borcu artar, kalan limiti azalır. Kalan Bakiye'den düşmez ('Kartla' olarak ayrı görünür); para kart borcunu ödediğin gün düşer."
      />
      <Row
        what="Kredi kartıyla taksitli alışveriş"
        where="+ → Gider → Kredi Kartı → kart → Taksit: 6 taksit. Tutara TOPLAM fiyatı yaz."
        effect="Banka gibi limitten tamamı düşer. Ekstrede gelen aylık taksitler bu kayıtla eşleşir, tekrar eklenmez."
      />
      <Row
        what="Kart ekstresi geldi"
        where="Kartlar → Ekstre PDF'i yükle (Garanti, İş Bankası, Denizbank okunur)"
        effect="Ekstredeki harcamalar eklenir (daha önce girdiklerin atlanır), kartın ekstre borcu, asgarisi ve gelmemiş taksitleri güncellenir."
      />
      <Row
        what="Kart borcunu ödedim"
        where="Kartlar → karta dokun → Borç öde (asgari / tamamı / başka tutar). Yeni İşlem ile GİRME"
        effect="Kartın borcu düşer, ödeme gider olarak kaydedilir ve Kalan Bakiye'den düşer. Harcama dağılımında ikinci kez sayılmaz."
      />
      <Row
        what="Kredi, arkadaş kartı taksiti, Eminevim ödedim"
        where="Borçlar → ilgili taksit → Bu ayı öde"
        effect="Havale/EFT gideri oluşur, Kalan Bakiye'den ve 'Bu ay kalan' kutularından düşer, kalan taksit sayısı azalır. Yanlışsa 'Geri al'."
      />
      <Row
        what="Kira, fatura, abonelik (her ay aynı)"
        where="Borçlar → Düzenli Gelir & Giderler → Ekle (kartla ödeniyorsa ödeme: Kredi Kartı + kart)"
        effect="Günü gelince kendiliğinden işlenir; elle girme. Kartla ödenen fatura kart borcuna eklenir."
      />
      <Row what="Maaş" where="Düzenli gelir olarak bir kez ekle" effect="Her ay günü gelince gelir olarak işlenir. Ay sonunda yatan maaş istersen sonraki aya sayılır." />
      <Row
        what="Birikime para ayırdım"
        where="+ → Birikim (hedef seç) ya da Akıllı Öneri → Detayları Gör → Ayır"
        effect="Kalan Bakiye'den düşer, hedefin dolar. Elindeki altın/döviz için Birikim → Varlık Ekle."
      />
      <Row what="Banka SMS'i" where="SMS'i paylaş → Cebim (ya da + → 'Banka SMS'inden doldur')" effect="Tutar, işyeri ve kart otomatik dolar; kontrol edip kaydet." />
    </Section>

    <Section icon={<Calculator className="w-5 h-5 text-sky-600" />} title="3. Rakamlar ne anlama geliyor?">
      <Formula name="Gider (Özet, İşlemler, Raporlar üstü)">Bu ay hesabından çıkan para: nakit/havale harcamalar, ödenen taksitler, kart borcu ödemeleri.</Formula>
      <Formula name="Kartla">Bu ay kredi kartıyla yapılan alışveriş. Henüz hesabından çıkmadı; kart borcunu ödeyince Gider'e girer.</Formula>
      <Formula name="Kalan Bakiye">Gelir − Gider − Birikim. Her ödemede düşer.</Formula>
      <Formula name="Bu ay harcayabileceğin (serbest kalan)">
        Elindeki para + gelecek gelir − bekleyen ödemeler (ödenmemiş taksit, sabit gider, kart asgarisi). Planlı bir ödemeyi yapınca değişmez,
        çünkü o para zaten ayrılmıştı; plan dışı bir harcama yapınca düşer.
      </Formula>
      <Formula name="Harcama dağılımı / kategoriler">Neye harcadığın: kartlı alışverişler dahil, kart borcu ödemesi hariç (yoksa iki kez sayılır).</Formula>
      <Formula name="Kart: Kalan limit">
        Limit − güncel borç − gelmemiş taksitler (± banka farkı). Bankadakiyle tutmazsa kartı düzenle → "Bankadaki kullanılabilir limit".
      </Formula>
      <Formula name="Kart: Ekstreden kalan / Kalan asgari">Son ekstrenin ödenmemiş kısmı ve son ödeme gününe kadar en az ödenmesi gereken.</Formula>
      <Formula name="Borçlar: Bu ay kalan">Bu ay daha ödenecek taksit ve sabit giderler. "Bu ayı öde" dedikçe azalır.</Formula>
    </Section>

    <Section icon={<ListChecks className="w-5 h-5 text-sky-600" />} title="4. Aylık rutin">
      <ul className="space-y-1.5">
        <li>☐ Harcamaları gün içinde gir (ya da SMS'i paylaş).</li>
        <li>☐ Ekstre gelince (bildirim gelir) PDF'i yükle.</li>
        <li>☐ Kart borcunu ödeyince Kartlar → Borç Öde.</li>
        <li>☐ Taksit/kredi/arkadaş kartı ödeyince Borçlar → Bu ayı öde.</li>
        <li>☐ Ay sonunda Raporlar'a bak: geçen aya göre neler arttı, kategori sınırları.</li>
        <li>☐ Kart limitleri bankadakiyle tutmuyorsa kartı düzenle → bankadaki kullanılabilir limit.</li>
      </ul>
    </Section>

    <Section icon={<ListChecks className="w-5 h-5 text-sky-600" />} title="Dokun ve git (kısayollar)">
      <ul className="space-y-1.5">
        <li>• <b>Özet'teki renkli kutular:</b> Gelir / Gider / Birikim kutusuna dokun → o ayın ilgili işlemleri filtreli açılır.</li>
        <li>• <b>Harcama Dağılımı, Kim ne harcadı, Geçen aya göre:</b> bir kategoriye ya da kişiye dokun → o harcamalar listelenir.</li>
        <li>• <b>Yaklaşan Ödemeler:</b> taksitin yanındaki <b>Öde</b> → bu ay ödendi olarak işlenir; satıra dokun → Kartlar/Borçlar açılır.</li>
        <li>• <b>Kredi kartı:</b> karta dokun → detay: borç, limit, asgari, hızlı ödeme (asgari / ekstrenin tamamı / başka tutar), ekstre yükleme, düzenleme ve son harcamalar.</li>
        <li>• <b>Taksit, düzenli gider, işlem satırı:</b> dokun → düzenle.</li>
      </ul>
    </Section>

    <Section icon={<CreditCard className="w-5 h-5 text-sky-600" />} title="5. Kartlar hakkında">
      <p>
        Kredi kartı harcaması iki aşamalıdır: <b>alışveriş</b> (kart borcu artar) ve <b>ödeme</b> (hesaptan para çıkar). Cebim ikisini ayrı
        tutar; böylece Kalan Bakiye bankadaki paranı, kart kutusu da kart borcunu gösterir.
      </p>
      <p>
        Ekstre kesim günü gelince güncel borç kendiliğinden "ekstre borcu" olur. Asgari, 100.000 ₺'ye kadar limitli kartlarda %20, üstünde %40'tır
        (ekstrede yazıyorsa ekstredeki kullanılır).
      </p>
    </Section>

    <Section icon={<Landmark className="w-5 h-5 text-sky-600" />} title="6. Borçlar ve taksitler">
      <p>
        Arkadaş kartından yapılan taksitleri arkadaşına havaleyle ödüyorsan Borçlar'a taksit olarak ekle (alacaklı: "Arkadaş Kartı").
        Her ay ödeyince "Bu ayı öde"ye bas. Kendi kartının taksitleri buraya değil, kart harcaması olarak girilir.
      </p>
      <p>"Borç kapatma planı" ile her ay fazladan ödersen ne zaman borçsuz kalacağını ve faiz kazancını görürsün.</p>
    </Section>

    <Section icon={<PiggyBank className="w-5 h-5 text-sky-600" />} title="7. Birikim">
      <p>Varlıklar (altın, döviz, TL) güncel alış fiyatıyla değerlenir. Hedefler için birikim işlemi girince hedefin dolar.</p>
    </Section>

    <Section icon={<HelpCircle className="w-5 h-5 text-sky-600" />} title="8. Sık sorulanlar">
      <Formula name="Ödeme yaptım ama 'harcayabileceğin' düşmedi">
        Planlı ödemeydi; para zaten ayrılmıştı. Kalan Bakiye ve "Elindeki para" düşer.
      </Formula>
      <Formula name="Kart kalan limiti bankadan farklı">Kartı düzenle → "Bankadaki kullanılabilir limit"e bankadaki rakamı yaz; birebir eşitlenir.</Formula>
      <Formula name="Aynı harcama iki kez görünüyor">
        Kart borcunu "Yeni İşlem" ile girdiysen sil ve Kartlar → Borç Öde kullan. Ekstreyi tekrar yüklemek tekrar eklemez.
      </Formula>
      <Formula name="Harcama yanlış karta yazıldı">İşlemler'de kayda dokun → kartı değiştir; kart borçları kendiliğinden düzelir.</Formula>
      <Formula name="Yeni sürüm gelmedi">Uygulamayı tamamen kapatıp aç; sağ üstteki sürüm numarası değişir.</Formula>
    </Section>
  </div>
);

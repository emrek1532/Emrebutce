import {
  CategoryLimit,
  FamilyMember,
  InstallmentDebt,
  SavingsGoal,
  Transaction
} from '../types/budget';

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'Şakir (Ben)', role: 'Maaşlı / Hane Reisi', color: '#10B981' },
  { id: 'm2', name: 'Eşim', role: 'Maaşlı / Ebeveyn', color: '#EC4899' },
  { id: 'm3', name: 'Ortak', role: 'Tüm Hane', color: '#3B82F6' }
];

export const EMINEVIM_SCHEDULE = [
  { period: 3, date: '2026-10-12', amount: 17400, paid: true, note: 'Bu ay ödendi' },
  { period: 4, date: '2026-11-12', amount: 18600, paid: false },
  { period: 5, date: '2026-12-12', amount: 21600, paid: false },
  { period: 6, date: '2027-01-12', amount: 24000, paid: false },
  { period: 7, date: '2027-02-12', amount: 25800, paid: false },
  { period: 8, date: '2027-03-12', amount: 30600, paid: false },
  { period: 9, date: '2027-04-12', amount: 34200, paid: false },
  { period: 10, date: '2027-05-12', amount: 40800, paid: false },
  { period: 11, date: '2027-06-12', amount: 40200, paid: false },
  { period: 12, date: '2027-07-12', amount: 37800, paid: false },
  { period: 13, date: '2027-08-12', amount: 33000, paid: false },
  { period: 14, date: '2027-09-12', amount: 31200, paid: false },
  { period: 15, date: '2027-10-12', amount: 29400, paid: false },
  { period: 16, date: '2027-11-12', amount: 27600, paid: false },
  { period: 17, date: '2027-12-12', amount: 25800, paid: false },
  { period: 18, date: '2028-01-12', amount: 24000, paid: false },
  { period: 19, date: '2028-02-12', amount: 22200, paid: false },
  { period: 20, date: '2028-03-12', amount: 19200, paid: false },
  { period: 21, date: '2028-04-12', amount: 17400, paid: false },
  { period: 22, date: '2028-05-12', amount: 14400, paid: false },
  { period: 23, date: '2028-06-12', amount: 13200, paid: false },
  { period: 24, date: '2028-07-12', amount: 12600, paid: false },
  { period: 25, date: '2028-08-12', amount: 11999.40, paid: false }
];

export const DEFAULT_INSTALLMENTS: InstallmentDebt[] = [
  {
    id: 'inst-eminevim-taksit',
    title: 'Eminevim Konut/Araç Taksitleri',
    creditor: 'Eminevim',
    member: 'Ortak',
    monthlyAmount: 18600, // Gelecek ayın tutarı
    paymentDayOfMonth: 12,
    startDate: '2026-08-12',
    endDate: '2028-08-12',
    category: 'Konut & Birikim',
    notes: 'Kalan Toplam Borç: 555.599,40 TL (22 taksit kaldı)',
    isVariableSchedule: true,
    schedule: EMINEVIM_SCHEDULE
  },
  {
    id: 'inst-eminevim-masraf',
    title: 'Eminevim Organizasyon Masrafı',
    creditor: 'Eminevim',
    member: 'Ortak',
    monthlyAmount: 5250,
    totalInstallments: 2,
    paidInstallments: 1,
    remainingInstallments: 1,
    paymentDayOfMonth: 12,
    startDate: '2026-10-12',
    endDate: '2026-11-12',
    category: 'Konut & Birikim',
    notes: 'Bu ay 5.250 TL ödendi. Son 1 taksit kaldı (Kasım 2026).'
  },
  {
    id: 'inst-isbank-yapilandirma',
    title: 'İşbank Kredi Kartı Yapılandırma Taksidi',
    creditor: 'İş Bankası',
    member: 'Şakir (Ben)',
    monthlyAmount: 6123.56,
    paymentDayOfMonth: 15,
    startDate: '2026-01-15',
    endDate: '2028-03-15',
    category: 'Banka Borcu & Kredi',
    notes: '15.03.2028 tarihinde bitecek (Aylık sabit 6.123,56 TL)'
  },
  {
    id: 'inst-enpara-kredi',
    title: 'Enpara Kredi Taksidi',
    creditor: 'Enpara',
    member: 'Şakir (Ben)',
    monthlyAmount: 2607.59,
    paymentDayOfMonth: 15,
    startDate: '2026-01-15',
    endDate: '2028-03-15',
    category: 'Banka Borcu & Kredi',
    notes: '15.03.2028 tarihinde bitecek (Aylık sabit 2.607,59 TL)'
  },
  {
    id: 'inst-es-enpara-yapilandirma',
    title: 'Eşimin Enpara Kredi Kartı Yapılandırma Borcu',
    creditor: 'Enpara',
    member: 'Eşim',
    monthlyAmount: 3039.29,
    paymentDayOfMonth: 5,
    startDate: '2025-12-05',
    endDate: '2027-12-05',
    category: 'Banka Borcu & Kredi',
    notes: '05.12.2027 tarihinde bitecek (Aylık sabit 3.039,29 TL)'
  },
  {
    id: 'inst-arkadas-motor',
    title: 'Arkadaş Kartı: Motor Ekipmanı',
    creditor: 'Arkadaş Kartı',
    member: 'Şakir (Ben)',
    monthlyAmount: 3833.33,
    paymentDayOfMonth: 10,
    startDate: '2026-01-10',
    endDate: '2027-01-10',
    category: 'Ulaşım & Motor',
    notes: '10.01.2027 tarihinde bitecek'
  },
  {
    id: 'inst-arkadas-sigorta',
    title: 'Arkadaş Kartı: Araç Sigortası (6 Taksit)',
    creditor: 'Arkadaş Kartı',
    member: 'Şakir (Ben)',
    monthlyAmount: 3232.05,
    totalInstallments: 6,
    paidInstallments: 1,
    remainingInstallments: 5,
    paymentDayOfMonth: 10,
    startDate: '2026-10-10',
    endDate: '2027-03-10',
    category: 'Sigorta & Araç',
    notes: 'İlk taksit bu ay ödendi (1/6). Kalan: 5 taksit'
  },
  {
    id: 'inst-arkadas-kasko',
    title: 'Arkadaş Kartı: Araç Kasko (9 Taksit)',
    creditor: 'Arkadaş Kartı',
    member: 'Şakir (Ben)',
    monthlyAmount: 2599.20,
    totalInstallments: 9,
    paidInstallments: 1,
    remainingInstallments: 8,
    paymentDayOfMonth: 10,
    startDate: '2026-10-10',
    endDate: '2027-06-10',
    category: 'Sigorta & Araç',
    notes: 'İlk taksit bu ay ödendi (1/9). Kalan: 8 taksit'
  },
  {
    id: 'inst-arkadas-ek-kasko-1',
    title: 'Arkadaş Kartı: Ek Kasko 1 (3 Taksit)',
    creditor: 'Arkadaş Kartı',
    member: 'Şakir (Ben)',
    monthlyAmount: 889.61,
    totalInstallments: 3,
    paidInstallments: 1,
    remainingInstallments: 2,
    paymentDayOfMonth: 10,
    startDate: '2026-10-10',
    endDate: '2026-12-10',
    category: 'Sigorta & Araç',
    notes: 'İlk taksit bu ay ödendi (1/3). Aralık 2026\'da bitiyor!'
  },
  {
    id: 'inst-arkadas-ek-kasko-2',
    title: 'Arkadaş Kartı: Ek Kasko 2 (6 Taksit)',
    creditor: 'Arkadaş Kartı',
    member: 'Şakir (Ben)',
    monthlyAmount: 375.00,
    totalInstallments: 6,
    paidInstallments: 1,
    remainingInstallments: 5,
    paymentDayOfMonth: 10,
    startDate: '2026-10-10',
    endDate: '2027-03-10',
    category: 'Sigorta & Araç',
    notes: 'İlk taksit bu ay ödendi (1/6). Mart 2027\'de bitiyor'
  },
  {
    id: 'inst-sirket-borc',
    title: 'Şirket Borcu Ödemesi',
    creditor: 'Şirket',
    member: 'Şakir (Ben)',
    monthlyAmount: 10000.00,
    paymentDayOfMonth: 1,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    category: 'Borç & İş',
    notes: 'Aylık düzenli şirket borç ödemesi'
  }
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  // MAAŞLAR (Ekim 2026)
  {
    id: 'tx-sakir-maas',
    type: 'income',
    amount: 74250,
    currency: 'TRY',
    category: 'Maaş & Ücret',
    member: 'Şakir (Ben)',
    date: '2026-10-01',
    description: 'Şakir Maaş Ödemesi',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'tx-es-maas',
    type: 'income',
    amount: 40000,
    currency: 'TRY',
    category: 'Maaş & Ücret',
    member: 'Eşim',
    date: '2026-10-01',
    description: 'Eşimin Maaş Ödemesi',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    createdAt: '2026-10-01T09:30:00Z'
  },

  // SABİT GİDERLER (Kira & Şirket)
  {
    id: 'tx-kira',
    type: 'expense',
    amount: 16500,
    currency: 'TRY',
    category: 'Konut & Kira',
    member: 'Ortak',
    date: '2026-10-01',
    description: 'Ev Kirası Ödemesi',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'tx-sirket-borc',
    type: 'expense',
    amount: 10000,
    currency: 'TRY',
    category: 'Borç & Kredi',
    member: 'Şakir (Ben)',
    date: '2026-10-01',
    description: 'Şirket Borç Ödemesi',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    createdAt: '2026-10-01T11:00:00Z'
  },

  // EMİNEVİM (Bu ay ödenen)
  {
    id: 'tx-eminevim-taksit-3',
    type: 'expense',
    amount: 17400,
    currency: 'TRY',
    category: 'Konut & Birikim',
    member: 'Ortak',
    date: '2026-10-12',
    description: 'Eminevim 3. Dönem Taksit Ödemesi',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    createdAt: '2026-10-12T10:00:00Z'
  },
  {
    id: 'tx-eminevim-masraf-1',
    type: 'expense',
    amount: 5250,
    currency: 'TRY',
    category: 'Konut & Birikim',
    member: 'Ortak',
    date: '2026-10-12',
    description: 'Eminevim Organizasyon Masrafı (1/2)',
    paymentMethod: 'Havale/EFT',
    isRecurring: false,
    createdAt: '2026-10-12T10:30:00Z'
  },

  // BANKA & KREDİ KARTI YAPILANDIRMALARI
  {
    id: 'tx-isbank-yapilandirma',
    type: 'expense',
    amount: 6123.56,
    currency: 'TRY',
    category: 'Borç & Kredi',
    member: 'Şakir (Ben)',
    date: '2026-10-15',
    description: 'İşbank Kredi Kartı Yapılandırma Taksidi (Bitiş: 15.03.2028)',
    paymentMethod: 'Banka Kartı',
    isRecurring: true,
    createdAt: '2026-10-15T09:00:00Z'
  },
  {
    id: 'tx-enpara-kredi',
    type: 'expense',
    amount: 2607.59,
    currency: 'TRY',
    category: 'Borç & Kredi',
    member: 'Şakir (Ben)',
    date: '2026-10-15',
    description: 'Enpara Kredi Taksidi (Bitiş: 15.03.2028)',
    paymentMethod: 'Banka Kartı',
    isRecurring: true,
    createdAt: '2026-10-15T09:15:00Z'
  },
  {
    id: 'tx-es-enpara-kredi',
    type: 'expense',
    amount: 3039.29,
    currency: 'TRY',
    category: 'Borç & Kredi',
    member: 'Eşim',
    date: '2026-10-05',
    description: 'Eşimin Enpara Kredi Kartı Yapılandırması (Bitiş: 05.12.2027)',
    paymentMethod: 'Banka Kartı',
    isRecurring: true,
    createdAt: '2026-10-05T09:00:00Z'
  },

  // ARKADAŞ KARTINDAN YAPILAN TAKSİTLER (Bu ay ilk taksitleri ödendi)
  {
    id: 'tx-arkadas-motor',
    type: 'expense',
    amount: 3833.33,
    currency: 'TRY',
    category: 'Ulaşım & Motor',
    member: 'Şakir (Ben)',
    date: '2026-10-10',
    description: 'Arkadaş Kartı: Motor Ekipmanı Taksidi (Bitiş: 10.01.2027)',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    createdAt: '2026-10-10T10:00:00Z'
  },
  {
    id: 'tx-arkadas-sigorta',
    type: 'expense',
    amount: 3232.05,
    currency: 'TRY',
    category: 'Sigorta & Araç',
    member: 'Şakir (Ben)',
    date: '2026-10-10',
    description: 'Arkadaş Kartı: Araç Sigortası (Taksit 1/6)',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    installmentInfo: { current: 1, total: 6 },
    createdAt: '2026-10-10T10:15:00Z'
  },
  {
    id: 'tx-arkadas-kasko',
    type: 'expense',
    amount: 2599.20,
    currency: 'TRY',
    category: 'Sigorta & Araç',
    member: 'Şakir (Ben)',
    date: '2026-10-10',
    description: 'Arkadaş Kartı: Kasko (Taksit 1/9)',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    installmentInfo: { current: 1, total: 9 },
    createdAt: '2026-10-10T10:20:00Z'
  },
  {
    id: 'tx-arkadas-ek-kasko-1',
    type: 'expense',
    amount: 889.61,
    currency: 'TRY',
    category: 'Sigorta & Araç',
    member: 'Şakir (Ben)',
    date: '2026-10-10',
    description: 'Arkadaş Kartı: Ek Kasko (Taksit 1/3 - Son 2 taksit)',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    installmentInfo: { current: 1, total: 3 },
    createdAt: '2026-10-10T10:25:00Z'
  },
  {
    id: 'tx-arkadas-ek-kasko-2',
    type: 'expense',
    amount: 375.00,
    currency: 'TRY',
    category: 'Sigorta & Araç',
    member: 'Şakir (Ben)',
    date: '2026-10-10',
    description: 'Arkadaş Kartı: Ek Kasko (Taksit 1/6)',
    paymentMethod: 'Havale/EFT',
    isRecurring: true,
    installmentInfo: { current: 1, total: 6 },
    createdAt: '2026-10-10T10:30:00Z'
  },

  // GÜNLÜK YAŞAM VE MARKET
  {
    id: 'tx-market-1',
    type: 'expense',
    amount: 4500,
    currency: 'TRY',
    category: 'Market & Gıda',
    member: 'Ortak',
    date: '2026-10-06',
    description: 'Aylık Toptan Market & Temizlik Alışverişi',
    paymentMethod: 'Kredi Kartı',
    isRecurring: false,
    createdAt: '2026-10-06T14:00:00Z'
  },
  {
    id: 'tx-faturalar-1',
    type: 'expense',
    amount: 2200,
    currency: 'TRY',
    category: 'Faturalar & Aidat',
    member: 'Ortak',
    date: '2026-10-08',
    description: 'Elektrik, Su & Fiber İnternet Faturaları',
    paymentMethod: 'Banka Kartı',
    isRecurring: true,
    createdAt: '2026-10-08T11:00:00Z'
  }
];

export const DEFAULT_CATEGORY_LIMITS: CategoryLimit[] = [
  {
    id: 'lim-konut',
    category: 'Konut & Kira',
    monthlyLimit: 17000,
    currency: 'TRY',
    color: '#3B82F6',
    iconName: 'Home',
    alertThresholdPercent: 95
  },
  {
    id: 'lim-eminevim',
    category: 'Konut & Birikim',
    monthlyLimit: 25000,
    currency: 'TRY',
    color: '#10B981',
    iconName: 'Building',
    alertThresholdPercent: 95
  },
  {
    id: 'lim-borc',
    category: 'Borç & Kredi',
    monthlyLimit: 25000,
    currency: 'TRY',
    color: '#EF4444',
    iconName: 'CreditCard',
    alertThresholdPercent: 90
  },
  {
    id: 'lim-sigorta',
    category: 'Sigorta & Araç',
    monthlyLimit: 12000,
    currency: 'TRY',
    color: '#8B5CF6',
    iconName: 'Shield',
    alertThresholdPercent: 90
  },
  {
    id: 'lim-market',
    category: 'Market & Gıda',
    monthlyLimit: 12000,
    currency: 'TRY',
    color: '#10B981',
    iconName: 'ShoppingCart',
    alertThresholdPercent: 80
  },
  {
    id: 'lim-faturalar',
    category: 'Faturalar & Aidat',
    monthlyLimit: 4000,
    currency: 'TRY',
    color: '#F59E0B',
    iconName: 'Zap',
    alertThresholdPercent: 85
  }
];

export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-eminevim-teslimat',
    title: 'Eminevim Teslimat & Birikim Hedefi',
    targetAmount: 600000,
    currentAmount: 44400.60, // Görseldeki Toplam Ödenen
    currency: 'TRY',
    targetDate: '2028-08-12',
    category: 'Konut/Araç',
    color: '#10B981',
    notes: 'Toplam Kalan: 555.599,40 TL. Teslimatla birlikte hane varlığına dönüşecek.',
    createdAt: '2026-08-12'
  },
  {
    id: 'goal-borcsuzluk',
    title: 'Tüm Kredi & Yapılandırmaları Sıfırlama',
    targetAmount: 180000,
    currentAmount: 65000,
    currency: 'TRY',
    targetDate: '2028-03-15',
    category: 'Finansal Özgürlük',
    color: '#3B82F6',
    notes: '2028 Mart ayında İşbank ve Enpara kredileri tamamen bitmiş olacak!',
    createdAt: '2026-01-01'
  }
];

export const EXPENSE_CATEGORIES = [
  'Konut & Kira',
  'Konut & Birikim',
  'Borç & Kredi',
  'Sigorta & Araç',
  'Ulaşım & Motor',
  'Market & Gıda',
  'Faturalar & Aidat',
  'Sağlık & Bakım',
  'Eğlence & Restoran',
  'Giyim & Alışveriş',
  'Diğer Harcamalar'
];

export const INCOME_CATEGORIES = [
  'Maaş & Ücret',
  'Ek Gelir & Prim',
  'Yatırım Geliri',
  'Diğer Gelirler'
];

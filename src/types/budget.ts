export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

// 'saving': birikime ayrılan para (harcama sayılmaz, isteğe bağlı bir hedefe eklenir)
export type TransactionType = 'income' | 'expense' | 'saving';

export type PaymentMethod = 'Nakit' | 'Kredi Kartı' | 'Banka Kartı' | 'Havale/EFT';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  member: string; // e.g., 'Emre', 'Eşim', 'Ortak'
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  goalId?: string;
  // Kredi kartıyla yapılan harcamada hangi kart (borcu bu karta eklenir)
  cardId?: string;
  // Sayıldığı bütçe ayı (YYYY-MM); boşsa tarihin ayı. Ay sonu maaşı sonraki aya sayılır.
  budgetMonth?: string;
  installmentInfo?: {
    current: number;
    total: number;
    installmentId?: string;
  };
  createdAt: string;
}

export interface CategoryLimit {
  id: string;
  category: string;
  monthlyLimit: number;
  currency: Currency;
  color: string;
  iconName: string;
  alertThresholdPercent: number; // e.g. 80
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate: string; // YYYY-MM-DD
  category: string;
  color: string;
  notes?: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface BudgetNotification {
  id: string;
  type: 'limit_warning' | 'limit_exceeded' | 'goal_reached' | 'sync_success' | 'installment_reminder' | 'statement_reminder' | 'month_summary';
  title: string;
  message: string;
  category?: string;
  timestamp: string;
  read: boolean;
}

export interface InstallmentScheduleItem {
  period: number;
  date: string; // YYYY-MM-DD
  amount: number;
  paid: boolean;
  note?: string;
}

export interface InstallmentDebt {
  id: string;
  title: string;
  creditor: string; // 'İşbank', 'Enpara', 'Eminevim', 'Arkadaş Kartı', 'Şirket'
  member: string;
  monthlyAmount: number;
  totalInstallments?: number;
  remainingInstallments?: number;
  paidInstallments?: number;
  paymentDayOfMonth: number;
  startDate: string;
  endDate: string;
  category: string;
  notes?: string;
  isVariableSchedule?: boolean;
  schedule?: InstallmentScheduleItem[];
  // Aylık faiz oranı (%), biliniyorsa; borç planında erken kapatma kazancı için
  monthlyInterestRate?: number;
}

export interface CreditCardAccount {
  id: string;
  bank: string;
  name: string;
  member: string;
  limit: number;
  currentDebt: number;
  statementDay: number; // ekstre kesim günü (1-31)
  dueDay: number; // son ödeme günü (1-31)
  // Son kesilen ekstrenin borcu ve ayı (YYYY-MM); kesim günü gelince güncel borçtan alınır
  statementDebt?: number;
  // Ekstre kesildiğindeki toplam (asgari ödeme bundan hesaplanır)
  statementTotal?: number;
  statementKey?: string;
  // Ekstresi yüklenen (ya da "gerek yok" denen) son ekstre ayı; hatırlatma bununla susar
  statementCheckedKey?: string;
  notes?: string;
}

// Her ay belirli günde kendiliğinden işleme dönüşen gelir/gider (maaş, kira vb.)
export interface RecurringItem {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  category: string;
  member: string;
  dayOfMonth: number;
  paymentMethod: PaymentMethod;
  active: boolean;
  cardId?: string;
  // Gelir ay sonunda yatıyorsa (ör. 30'unda) sonraki ayın bütçesine sayılır
  countForNextMonth?: boolean;
  // Kullanıcının o ay için sildiği (yeniden oluşturulmayacak) aylar, YYYY-MM
  skipMonths?: string[];
}

// Elde tutulan birikim: altın (gram/ayar ya da sikke adedi), döviz veya TL
export type AssetKind =
  | 'has'
  | 'ayar22'
  | 'ayar18'
  | 'ayar14'
  | 'ceyrek'
  | 'yarim'
  | 'tam'
  | 'ata'
  | 'gremse'
  | 'ata5'
  | 'gumus'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'TRY';

export interface AssetHolding {
  id: string;
  kind: AssetKind;
  amount: number; // gram, adet ya da döviz/TL tutarı
  member: string;
  note?: string;
  updatedAt: string;
}

// Birikimlerin toplam değerinin günlük kaydı (id = YYYY-MM-DD)
export interface AssetSnapshot {
  id: string;
  total: number; // TL
}

export interface CloudVaultPayload {
  version: number;
  updatedAt: string;
  transactions: Transaction[];
  categoryLimits: CategoryLimit[];
  savingsGoals: SavingsGoal[];
  familyMembers: FamilyMember[];
  installments?: InstallmentDebt[];
  creditCards?: CreditCardAccount[];
  recurring?: RecurringItem[];
  assets?: AssetHolding[];
  assetHistory?: AssetSnapshot[];
  currency: Currency;
}

export interface EncryptedSyncData {
  vaultId: string;
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
  updatedAt: string;
  clientInfo?: string;
}

export type ActiveTab = 'overview' | 'transactions' | 'reports' | 'installments' | 'cards' | 'goals';

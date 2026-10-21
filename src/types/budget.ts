export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'Nakit' | 'Kredi Kartı' | 'Banka Kartı' | 'Havale/EFT';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: string;
  member: string; // e.g., 'Şakir (Ben)', 'Eşim', 'Ortak'
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
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
  type: 'limit_warning' | 'limit_exceeded' | 'goal_reached' | 'sync_success' | 'installment_reminder';
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
}

export interface CloudVaultPayload {
  version: number;
  updatedAt: string;
  transactions: Transaction[];
  categoryLimits: CategoryLimit[];
  savingsGoals: SavingsGoal[];
  familyMembers: FamilyMember[];
  installments?: InstallmentDebt[];
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

export type DeviceMode = 'auto' | 'mobile' | 'tablet' | 'desktop';
export type ActiveTab =
  | 'overview'
  | 'transactions'
  | 'installments'
  | 'simulator'
  | 'analytics'
  | 'limits'
  | 'goals'
  | 'cloud';

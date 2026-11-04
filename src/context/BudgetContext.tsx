import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Transaction,
  CategoryLimit,
  SavingsGoal,
  FamilyMember,
  InstallmentDebt,
  CreditCardAccount,
  RecurringItem,
  AssetHolding,
  AssetSnapshot,
  BudgetNotification,
  Currency,
  DeviceMode,
  CloudVaultPayload
} from '../types/budget';
import {
  DEFAULT_FAMILY_MEMBERS
} from '../data/initialData';
import {
  generateVaultId,
  generateMasterPassphrase,
  encryptData,
  decryptData,
  deriveWriteToken
} from '../utils/crypto';
import { mergeVault } from '../utils/vaultMerge';
import { convertCurrency, formatCurrency, refreshRates } from '../utils/currencies';
import {
  saveVault,
  loadVault,
  VaultNotFoundError,
  EncryptedVaultRecord,
  connectVaultLive,
  VaultLiveLink,
  loadVaultBackup,
  VaultConflictError
} from '../utils/cloudStore';
import { readShareLinkFromLocation } from '../utils/shareLink';
import { lastStatementKey } from '../utils/cardStatement';
import { budgetMonthOf, isCashExpense, monthKeyOf, shiftMonthKey } from '../utils/budgetMonth';
import { readXlsx } from '../utils/xlsxReader';
import { buildImportFromSheets } from '../utils/excelImport';

interface SyncConfig {
  vaultId: string;
  passphrase: string;
  autoSync: boolean;
  status: 'synced' | 'syncing' | 'offline' | 'error' | 'pending';
  lastSyncedAt?: string;
  errorMessage?: string;
  // Bu cihazın bildiği son bulut sürümünün sunucu zamanı
  remoteUpdatedAt?: string;
}

// Anlık sinyal kaçarsa diye yedek kontrol aralığı
const PULL_INTERVAL_MS = 60000;
// Son değişiklikten sonra buluta gönderme gecikmesi
const PUSH_DEBOUNCE_MS = 1500;

function isNewer(remote?: string, known?: string): boolean {
  if (!remote) return false;
  if (!known) return true;
  return Date.parse(remote) > Date.parse(known);
}

interface BudgetContextValue {
  transactions: Transaction[];
  categoryLimits: CategoryLimit[];
  savingsGoals: SavingsGoal[];
  familyMembers: FamilyMember[];
  installments: InstallmentDebt[];
  currency: Currency;
  notifications: BudgetNotification[];
  syncConfig: SyncConfig;
  deviceMode: DeviceMode;
  effectiveDevice: 'mobile' | 'tablet' | 'desktop';
  darkMode: boolean;

  // Filters
  filterQuery: string;
  setFilterQuery: (q: string) => void;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  filterMember: string;
  setFilterMember: (m: string) => void;
  filterType: 'all' | 'income' | 'expense' | 'saving';
  setFilterType: (t: 'all' | 'income' | 'expense' | 'saving') => void;
  filterDateRange: 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year';
  setFilterDateRange: (d: 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year') => void;
  filteredTransactions: Transaction[];

  // Mutations
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateSavingsGoal: (goal: SavingsGoal) => void;
  depositToGoal: (id: string, amount: number) => void;
  deleteSavingsGoal: (id: string) => void;
  updateCategoryLimit: (limit: CategoryLimit) => void;
  addCategoryLimit: (limit: Omit<CategoryLimit, 'id'>) => void;
  deleteCategoryLimit: (id: string) => void;
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => void;
  addInstallment: (inst: Omit<InstallmentDebt, 'id'>) => void;
  updateInstallment: (inst: InstallmentDebt) => void;
  creditCards: CreditCardAccount[];
  addCreditCard: (card: Omit<CreditCardAccount, 'id'>) => void;
  updateCreditCard: (card: CreditCardAccount) => void;
  deleteCreditCard: (id: string) => void;
  payCardDebt: (cardId: string, amount: number, recordAsExpense: boolean) => void;
  recurring: RecurringItem[];
  assets: AssetHolding[];
  assetHistory: AssetSnapshot[];
  recordAssetSnapshot: (totalTl: number) => void;
  saveAsset: (asset: Omit<AssetHolding, 'id' | 'updatedAt'> & { id?: string }) => void;
  deleteAsset: (id: string) => void;
  addRecurring: (item: Omit<RecurringItem, 'id'>) => void;
  updateRecurring: (item: RecurringItem) => void;
  deleteRecurring: (id: string) => void;
  deleteInstallment: (id: string) => void;
  markInstallmentPaid: (id: string, period?: number) => void;
  undoInstallmentPayment: (id: string) => void;
  isInstallmentPaidThisMonth: (id: string) => boolean;
  setCurrency: (c: Currency) => void;
  setDeviceMode: (m: DeviceMode) => void;
  toggleDarkMode: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  resetAllData: () => void;

  // Cloud & Encryption
  syncToCloud: () => Promise<boolean>;
  rotatePassphrase: () => Promise<string>;
  syncFromCloud: (customVaultId?: string, customPassphrase?: string) => Promise<boolean>;
  createNewVault: () => void;
  updateSyncCredentials: (vaultId: string, passphrase: string, autoSync: boolean) => void;
  exportEncryptedVault: () => Promise<void>;
  exportCsv: () => void;
  importVaultBackup: (file: File) => Promise<void>;
  importExcel: (file: File) => Promise<string>;
  restoreBackup: (slot: string) => Promise<void>;
  // Hazır kimlikli işlemleri toplu ekler/günceller (kart borcuna eklemez); eklenen sayıyı döndürür
  importTransactions: (txs: Transaction[]) => number;

  // Calculated Metrics
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthlyIncome: number;
  monthlyExpense: number;
  // Bu ay kartla yapılan harcamalar (net bakiyeden düşülmez; kart borcu ödenince düşer)
  monthlyCardSpend: number;
  monthlySavings: number;
  ratesVersion: number;
  monthlyBalance: number;
  savingsRate: number;
  categorySpendingMap: Record<string, number>;
}

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

const LS_TRANSACTIONS = 'ailve_txs_v5';
const LS_LIMITS = 'ailve_limits_v5';
const LS_GOALS = 'ailve_goals_v5';
const LS_MEMBERS = 'ailve_members_v5';
const LS_INSTALLMENTS = 'ailve_installments_v5';
const LS_CARDS = 'ailve_cards_v5';
const LS_RECURRING = 'ailve_recurring_v5';
const LS_ASSETS = 'cebim_assets_v1';
const LS_ASSET_HISTORY = 'cebim_asset_history_v1';
const LS_CURRENCY = 'ailve_currency_v5';
const LS_SYNC = 'ailve_sync_v5';
// Buluta henüz gönderilmemiş yerel değişiklik var mı (uygulama kapansa da hatırlanır)
const LS_SYNC_DIRTY = 'ailve_sync_dirty_v5';
// Bulutla en son anlaşılan kasa içeriği (birleştirme tabanı)
const LS_SYNC_BASE = 'ailve_sync_base_v5';
const LS_THEME = 'cebim_theme_v6';
const LS_NOTIFICATIONS = 'ailve_notifications_v5';
const LS_DISMISSED = 'cebim_dismissed_notifications';
const LS_DEVICE = 'ailve_device_mode_v5';

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(LS_TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>(() => {
    const saved = localStorage.getItem(LS_LIMITS);
    return saved ? JSON.parse(saved) : [];
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem(LS_GOALS);
    return saved ? JSON.parse(saved) : [];
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem(LS_MEMBERS);
    return saved ? JSON.parse(saved) : DEFAULT_FAMILY_MEMBERS;
  });

  const [installments, setInstallments] = useState<InstallmentDebt[]>(() => {
    const saved = localStorage.getItem(LS_INSTALLMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [creditCards, setCreditCards] = useState<CreditCardAccount[]>(() => {
    const saved = localStorage.getItem(LS_CARDS);
    return saved ? JSON.parse(saved) : [];
  });

  const [recurring, setRecurring] = useState<RecurringItem[]>(() => {
    const saved = localStorage.getItem(LS_RECURRING);
    return saved ? JSON.parse(saved) : [];
  });

  const [assetHistory, setAssetHistory] = useState<AssetSnapshot[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_ASSET_HISTORY) || '[]');
    } catch {
      return [];
    }
  });

  const [assets, setAssets] = useState<AssetHolding[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_ASSETS) || '[]');
    } catch {
      return [];
    }
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(LS_CURRENCY) as Currency;
    return saved || 'TRY';
  });

  const [notifications, setNotifications] = useState<BudgetNotification[]>(() => {
    const saved = localStorage.getItem(LS_NOTIFICATIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem(LS_SYNC);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Yeni cihaz kendiliğinden kasa açmaz: önce mevcut kasaya bağlanması ya da yeni kasa açması istenir
    return {
      vaultId: '',
      passphrase: '',
      autoSync: true,
      status: 'synced',
      lastSyncedAt: new Date().toISOString()
    };
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LS_THEME);
    // Varsayılan açık tema; kullanıcı isterse koyu temaya geçebilir
    return saved === 'dark';
  });

  // Görünüm her zaman ekran genişliğine göre otomatik seçilir
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>('auto');

  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'saving'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year'>('this_month');

  // Window resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute effective device
  const effectiveDevice: 'mobile' | 'tablet' | 'desktop' = useMemo(() => {
    if (deviceMode !== 'auto') {
      return deviceMode;
    }
    if (windowWidth < 640) return 'mobile';
    if (windowWidth < 1024) return 'tablet';
    return 'desktop';
  }, [deviceMode, windowWidth]);

  // Dark mode effect
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(LS_THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(LS_THEME, 'light');
    }
  }, [darkMode]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(LS_LIMITS, JSON.stringify(categoryLimits));
  }, [categoryLimits]);

  useEffect(() => {
    localStorage.setItem(LS_GOALS, JSON.stringify(savingsGoals));
  }, [savingsGoals]);

  useEffect(() => {
    localStorage.setItem(LS_MEMBERS, JSON.stringify(familyMembers));
  }, [familyMembers]);

  useEffect(() => {
    localStorage.setItem(LS_INSTALLMENTS, JSON.stringify(installments));
  }, [installments]);

  useEffect(() => {
    localStorage.setItem(LS_CARDS, JSON.stringify(creditCards));
  }, [creditCards]);

  useEffect(() => {
    localStorage.setItem(LS_RECURRING, JSON.stringify(recurring));
  }, [recurring]);

  useEffect(() => {
    localStorage.setItem(LS_ASSETS, JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem(LS_ASSET_HISTORY, JSON.stringify(assetHistory));
  }, [assetHistory]);

  useEffect(() => {
    localStorage.setItem(LS_CURRENCY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(LS_SYNC, JSON.stringify(syncConfig));
  }, [syncConfig]);

  useEffect(() => {
    localStorage.setItem(LS_DEVICE, deviceMode);
  }, [deviceMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const setCurrency = (c: Currency) => setCurrencyState(c);
  const setDeviceMode = (m: DeviceMode) => setDeviceModeState(m);

  // Güncel döviz kurları: değişince tutarlar yeniden hesaplansın
  const [ratesVersion, setRatesVersion] = useState(0);
  useEffect(() => {
    refreshRates().then((changed) => {
      if (changed) setRatesVersion((v) => v + 1);
    });
  }, []);

  // Özette gösterilen ay (YYYY-MM); varsayılan bu ay, önceki aylara geçilebilir
  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKeyOf(new Date()));
  const currentMonthPrefix = selectedMonth;

  const categorySpendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === 'expense' && budgetMonthOf(tx) === currentMonthPrefix) {
        const converted = convertCurrency(tx.amount, tx.currency, currency);
        map[tx.category] = (map[tx.category] || 0) + converted;
      }
    });
    return map;
  }, [transactions, currentMonthPrefix, currency, ratesVersion]);

  // Monthly totals
  // Nakit akışı: kartla yapılan harcama o an hesaptan para çıkarmaz; para kart borcu ödendiğinde çıkar
  // (o ödeme ayrıca gider olarak girilir). Bu yüzden kartlı harcamalar net bakiyeden düşülmez, ayrı gösterilir.
  const { monthlyIncome, monthlyExpense, monthlySavings, monthlyCardSpend } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let sav = 0;
    let card = 0;
    transactions.forEach((tx) => {
      if (budgetMonthOf(tx) === currentMonthPrefix) {
        const val = convertCurrency(tx.amount, tx.currency, currency);
        if (tx.type === 'income') inc += val;
        else if (tx.type === 'saving') sav += val;
        else if (isCashExpense(tx)) exp += val;
        else card += val;
      }
    });
    return { monthlyIncome: inc, monthlyExpense: exp, monthlySavings: sav, monthlyCardSpend: card };
  }, [transactions, currentMonthPrefix, currency, ratesVersion]);

  // Elde kalan: gelir - gider - birikime ayrılan
  const monthlyBalance = monthlyIncome - monthlyExpense - monthlySavings;
  // Gelirin birikime ayrılan yüzdesi
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  // Automated Category Limit Check & Notification generation
  const evaluateLimits = useCallback(
    (currentTxList: Transaction[], currentLimitList: CategoryLimit[]) => {
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Calculate spending for each category in current month
      const spending: Record<string, number> = {};
      currentTxList.forEach((tx) => {
        if (tx.type === 'expense' && budgetMonthOf(tx) === currentYearMonth) {
          const inTRY = convertCurrency(tx.amount, tx.currency, 'TRY');
          spending[tx.category] = (spending[tx.category] || 0) + inTRY;
        }
      });

      const newAlerts: BudgetNotification[] = [];

      currentLimitList.forEach((limit) => {
        const spent = spending[limit.category] || 0;
        const limitInTRY = convertCurrency(limit.monthlyLimit, limit.currency, 'TRY');
        const ratio = limitInTRY > 0 ? (spent / limitInTRY) * 100 : 0;

        // Check if exceeded
        if (ratio >= 100) {
          const alertId = `limit-exceeded-${limit.category}-${currentYearMonth}`;
          newAlerts.push({
            id: alertId,
            type: 'limit_exceeded',
            title: `Kritik Limit Aşımı: ${limit.category}`,
            message: `${limit.category} harcamanız (${formatCurrency(spent, 'TRY')}) belirlenen ${formatCurrency(limitInTRY, 'TRY')} bütçe limitini aştı!`,
            category: limit.category,
            timestamp: new Date().toISOString(),
            read: false
          });
        } else if (ratio >= limit.alertThresholdPercent) {
          const alertId = `limit-warn-${limit.category}-${currentYearMonth}`;
          newAlerts.push({
            id: alertId,
            type: 'limit_warning',
            title: `Limit Yaklaştı: ${limit.category}`,
            message: `${limit.category} kategorisindeki harcamalarınız aylık bütçenin %${Math.round(ratio)} seviyesine ulaştı.`,
            category: limit.category,
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      });

      if (newAlerts.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const toAdd = newAlerts.filter((n) => !existingIds.has(n.id));
          return [...toAdd, ...prev];
        });
      }
    },
    []
  );

  // Trigger limit check whenever transactions or limits change
  useEffect(() => {
    evaluateLimits(transactions, categoryLimits);
  }, [transactions, categoryLimits, evaluateLimits]);

  const remoteUpdatedAtRef = useRef<string | undefined>(syncConfig.remoteUpdatedAt);
  // Buluttan çekilen veri state'e yazılınca tetiklenen otomatik gönderimi atla (ping-pong olmasın).
  // Açılışta da true: cihaz önce buluttakini çeker, kendi eski verisini körlemesine göndermez.
  const skipNextAutoPushRef = useRef(true);
  const liveLinkRef = useRef<VaultLiveLink | null>(null);
  const dirtyRef = useRef<boolean>(localStorage.getItem(LS_SYNC_DIRTY) === '1');
  const setDirty = (value: boolean) => {
    dirtyRef.current = value;
    try {
      if (value) localStorage.setItem(LS_SYNC_DIRTY, '1');
      else localStorage.removeItem(LS_SYNC_DIRTY);
    } catch {
      // depolama erişilemezse yalnızca bellekte tut
    }
  };

  // Bulutla en son anlaşılan sürüm (üç yollu birleştirmenin ortak tabanı)
  const baseRef = useRef<CloudVaultPayload | null>(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(LS_SYNC_BASE) || 'null');
      } catch {
        return null;
      }
    })()
  );
  const setBase = (payload: CloudVaultPayload) => {
    baseRef.current = payload;
    try {
      localStorage.setItem(LS_SYNC_BASE, JSON.stringify(payload));
    } catch {
      // depolama doluysa yalnızca bellekte tut
    }
  };

  const decryptRecord = async (data: EncryptedVaultRecord, pass: string): Promise<CloudVaultPayload> => {
    let decrypted: CloudVaultPayload;
    try {
      decrypted = await decryptData({ ciphertext: data.ciphertext, iv: data.iv, salt: data.salt }, pass);
    } catch {
      throw new Error(
        'Buluttaki kasa bu cihazdaki anahtarla açılamadı. Anahtar başka bir cihazda değiştirilmiş olabilir; diğer cihazdan "Linki Paylaş" ile yeni linki alıp açın.'
      );
    }
    if (!decrypted || !decrypted.transactions) throw new Error('Geçersiz kasa veri yapısı.');
    return decrypted;
  };

  const applyPayload = (payload: CloudVaultPayload) => {
    skipNextAutoPushRef.current = true;
    setTransactions(payload.transactions);
    if (payload.categoryLimits) setCategoryLimits(payload.categoryLimits);
    if (payload.savingsGoals) setSavingsGoals(payload.savingsGoals);
    if (payload.familyMembers) setFamilyMembers(payload.familyMembers);
    if (payload.installments) setInstallments(payload.installments);
    if (payload.creditCards) setCreditCards(payload.creditCards);
    if (payload.recurring) setRecurring(payload.recurring);
    if (payload.assets) setAssets(payload.assets);
    if (payload.assetHistory) setAssetHistory(payload.assetHistory);
    if (payload.currency) setCurrencyState(payload.currency);
  };

  const applyRemoteVault = useCallback(
    async (data: EncryptedVaultRecord, pass: string): Promise<CloudVaultPayload> => {
      const decrypted = await decryptRecord(data, pass);
      applyPayload(decrypted);
      setBase(decrypted);
      remoteUpdatedAtRef.current = data.updatedAt;
      return decrypted;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Bulutta bu cihazın bildiğinden daha yeni bir sürüm varsa sessizce çek
  const pullIfNewer = useCallback(async (): Promise<boolean> => {
    if (!syncConfig.vaultId || !syncConfig.passphrase) return false;
    let remote: EncryptedVaultRecord;
    try {
      remote = await loadVault(syncConfig.vaultId);
    } catch (err) {
      if (err instanceof VaultNotFoundError) return false;
      throw err;
    }
    if (!isNewer(remote.updatedAt, remoteUpdatedAtRef.current)) return false;

    try {
      await applyRemoteVault(remote, syncConfig.passphrase);
    } catch (err: any) {
      setSyncConfig((prev) => ({ ...prev, status: 'error', errorMessage: err.message }));
      throw err;
    }
    setSyncConfig((prev) => ({
      ...prev,
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      remoteUpdatedAt: remoteUpdatedAtRef.current,
      errorMessage: undefined
    }));
    return true;
  }, [syncConfig.vaultId, syncConfig.passphrase, applyRemoteVault]);

  const currentPayload = (): CloudVaultPayload => ({
    version: 2,
    updatedAt: new Date().toISOString(),
    transactions,
    categoryLimits,
    savingsGoals,
    familyMembers,
    installments,
    creditCards,
    recurring,
    assets,
    assetHistory,
    currency
  });

  // Şifreleyip buluta yazar; newPassphrase verilirse kasa yeni anahtarla şifrelenir ve yazma izni ona devredilir
  const pushPayload = async (payload: CloudVaultPayload, newPassphrase?: string, expectedUpdatedAt?: string | null) => {
    const pass = newPassphrase ?? syncConfig.passphrase;
    const encrypted = await encryptData(payload, pass);
    const writeToken = await deriveWriteToken(syncConfig.vaultId, syncConfig.passphrase);
    const newWriteToken = newPassphrase ? await deriveWriteToken(syncConfig.vaultId, newPassphrase) : undefined;
    const serverUpdatedAt = await saveVault(
      syncConfig.vaultId,
      { ...encrypted, version: payload.version, updatedAt: payload.updatedAt, clientInfo: `Cebim-${effectiveDevice}` },
      writeToken,
      newWriteToken,
      expectedUpdatedAt === undefined ? remoteUpdatedAtRef.current ?? null : expectedUpdatedAt
    );
    remoteUpdatedAtRef.current = serverUpdatedAt ?? payload.updatedAt;
    setBase(payload);
    setDirty(false);
    liveLinkRef.current?.notifyUpdated(remoteUpdatedAtRef.current);
  };

  // Synchronize to cloud backend
  const syncToCloud = useCallback(async (): Promise<boolean> => {
    // Kasa seçilmeden gönderim yok; değişiklik işaretli kalır, kasa açılınca/bağlanınca gider
    if (!syncConfig.vaultId || !syncConfig.passphrase) return false;

    setSyncConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));

    try {
      let payload = currentPayload();
      let mergedFromRemote = false;

      // Başka bir cihaz daha yeni sürüm yüklediyse: bu cihazda bekleyen değişiklik yoksa onu al,
      // varsa iki tarafı kayıt bazında birleştirip öyle gönder (kimsenin değişikliği kaybolmaz).
      // Sunucu, bu cihazın bildiği sürümden sonra başka yazma olduysa reddeder; o zaman yeniden birleştirilir.
      for (let attempt = 0; attempt < 4; attempt++) {
        let remote: EncryptedVaultRecord | null = null;
        try {
          remote = await loadVault(syncConfig.vaultId);
        } catch (err) {
          if (!(err instanceof VaultNotFoundError)) throw err;
        }
        if (remote && isNewer(remote.updatedAt, remoteUpdatedAtRef.current)) {
          const remotePayload = await decryptRecord(remote, syncConfig.passphrase);
          if (!dirtyRef.current && !mergedFromRemote) {
            applyPayload(remotePayload);
            setBase(remotePayload);
            remoteUpdatedAtRef.current = remote.updatedAt;
            setSyncConfig((prev) => ({
              ...prev,
              status: 'synced',
              lastSyncedAt: new Date().toISOString(),
              remoteUpdatedAt: remoteUpdatedAtRef.current
            }));
            return true;
          }
          payload = mergeVault(baseRef.current, payload, remotePayload);
          applyPayload(payload);
          // Birleştirilen hal artık bu sürümün üzerine kuruldu
          setBase(remotePayload);
          remoteUpdatedAtRef.current = remote.updatedAt;
          mergedFromRemote = true;
        }
        try {
          await pushPayload(payload, undefined, remote ? remote.updatedAt ?? null : null);
          break;
        } catch (err) {
          if (err instanceof VaultConflictError && attempt < 3) continue;
          throw err;
        }
      }

      setSyncConfig((prev) => ({
        ...prev,
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        remoteUpdatedAt: remoteUpdatedAtRef.current
      }));

      return true;
    } catch (err: any) {
      console.error('Cloud sync error:', err);
      setSyncConfig((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Bulut eşitleme hatası'
      }));
      return false;
    }
  }, [
    syncConfig.vaultId,
    syncConfig.passphrase,
    pullIfNewer,
    transactions,
    categoryLimits,
    savingsGoals,
    familyMembers,
    installments,
    creditCards,
    recurring,
    assets,
    assetHistory,
    currency,
    effectiveDevice
  ]);

  // Sync from Cloud backend
  const syncFromCloud = useCallback(
    async (customVaultId?: string, customPassphrase?: string): Promise<boolean> => {
      const vId = customVaultId || syncConfig.vaultId;
      const pass = customPassphrase || syncConfig.passphrase;

      if (!vId || !pass) {
        setSyncConfig((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: 'Paylaşım linki geçersiz.'
        }));
        return false;
      }

      setSyncConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));

      try {
        const data = await loadVault(vId);
        // Decrypt payload with passphrase
        const decrypted = await applyRemoteVault(data, pass);

        if (decrypted) {
          setSyncConfig((prev) => ({
            ...prev,
            vaultId: vId,
            passphrase: pass,
            status: 'synced',
            lastSyncedAt: new Date().toISOString(),
            remoteUpdatedAt: remoteUpdatedAtRef.current,
            errorMessage: undefined
          }));

          // Notify user
          setNotifications((prev) => [
            {
              id: `sync-ok-${Date.now()}`,
              type: 'sync_success',
              title: 'Bulut Eşitleme Başarılı',
              message: 'Tüm bütçe verileriniz uçtan uca şifreli buluttan başarıyla çekildi ve güncellendi.',
              timestamp: new Date().toISOString(),
              read: false
            },
            ...prev
          ]);

          return true;
        } else {
          throw new Error('Geçersiz kasa veri yapısı.');
        }
      } catch (err: any) {
        console.error('Sync from cloud failed:', err);
        setSyncConfig((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err.message || 'Buluttan veri çekilemedi'
        }));
        return false;
      }
    },
    [syncConfig.vaultId, syncConfig.passphrase, applyRemoteVault]
  );

  // Aile paylaşım linkiyle açıldıysa o verilere bağlan (bu cihaz başka verilere bağlı olsa bile linktekine geçer)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const connectFromLocation = () => {
      const creds = readShareLinkFromLocation();
      if (!creds) return;
      // Gizli kısım adres çubuğunda ve geçmişte kalmasın
      window.history.replaceState({}, document.title, window.location.pathname);
      if (creds.vaultId === syncConfigRef.current.vaultId && creds.passphrase === syncConfigRef.current.passphrase) return;
      syncFromCloudRef.current(creds.vaultId, creds.passphrase);
    };
    connectFromLocation();
    window.addEventListener('hashchange', connectFromLocation);
    return () => window.removeEventListener('hashchange', connectFromLocation);
  }, []);

  // Düzenli gelir/giderler: bu ayın günü geldiyse işlemi bir kez oluşturur. İşlem kimliği
  // (kalem + ay) sabit olduğu için iki cihaz aynı ayı oluştursa da kopya oluşmaz.
  useEffect(() => {
    // Sonraki aya devreden gelirde bu ayın bütçesini geçen ayın ödemesi oluşturur (30 Ekim maaşı → Kasım);
    // bu ayki ödeme günü gelince o da oluşur ve sonraki aya sayılır.
    const today = new Date();
    const todayStr = monthKeyOf(today) + '-' + String(today.getDate()).padStart(2, '0');
    const existing = new Set(transactions.map((t) => t.id));
    // Bir kalem aynı bütçe ayına iki kez sayılmasın (ör. devretme sonradan açıldıysa)
    const counted = new Set(
      transactions.flatMap((t) => {
        const m = t.id.match(/^rec-(.+)-\d{4}-\d{2}$/);
        return m ? [`${m[1]}|${budgetMonthOf(t)}`] : [];
      })
    );
    const created: Transaction[] = [];
    for (const r of recurring) {
      if (!r.active) continue;
      const carry = r.type === 'income' && r.countForNextMonth;
      const months = carry ? [shiftMonthKey(monthKeyOf(today), -1), monthKeyOf(today)] : [monthKeyOf(today)];
      for (const mk of months) {
        const [y, m] = mk.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const date = `${mk}-${String(Math.min(r.dayOfMonth, lastDay)).padStart(2, '0')}`;
        const id = `rec-${r.id}-${mk}`;
        // Atlanan ay, kalemin sayıldığı bütçe ayına göre tutulur
        const budgetMonth = carry ? shiftMonthKey(mk, 1) : mk;
        if (date > todayStr || existing.has(id) || counted.has(`${r.id}|${budgetMonth}`) || r.skipMonths?.includes(budgetMonth)) continue;
        // Aynı gelir o bütçe ayına zaten elle girildiyse (yakın tutar) ikinci kez ekleme
        if (
          r.type === 'income' &&
          transactions.some(
            (t) =>
              t.type === 'income' &&
              !t.id.startsWith('rec-') &&
              budgetMonthOf(t) === budgetMonth &&
              Math.abs(t.amount - r.amount) <= Math.max(1, r.amount * 0.02)
          )
        )
          continue;
        created.push({
          id,
          type: r.type,
          amount: r.amount,
          currency: 'TRY',
          category: r.category,
          member: r.member,
          date,
          budgetMonth: carry ? budgetMonth : undefined,
          description: r.title,
          paymentMethod: r.paymentMethod,
          cardId: r.type === 'expense' && r.paymentMethod === 'Kredi Kartı' ? r.cardId : undefined,
          isRecurring: true,
          createdAt: new Date().toISOString()
        });
      }
    }
    if (created.length === 0) return;
    setTransactions((prev) => [...created, ...prev.filter((t) => !created.some((c) => c.id === t.id))]);
    created.forEach((tx) => applyCardDebt(tx, 1));
  }, [recurring, transactions]);

  // Hesap kesim günü geldiyse kartın o anki borcu yeni ekstre borcu olur (ay başına bir kez)
  useEffect(() => {
    const due = creditCards.filter((c) => c.statementKey !== lastStatementKey(c));
    if (due.length === 0) return;
    setCreditCards((prev) =>
      prev.map((c) => {
        const key = lastStatementKey(c);
        return c.statementKey === key ? c : { ...c, statementDebt: c.currentDebt, statementTotal: c.currentDebt, statementKey: key };
      })
    );
  }, [creditCards]);

  // Yeni ekstre kesilen ve henüz yüklenmeyen kartlar için bildirim (kart + ay başına bir kez)
  useEffect(() => {
    const due = creditCards.filter((c) => c.currentDebt > 0 && c.statementCheckedKey !== lastStatementKey(c));
    if (due.length === 0) return;
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(LS_DISMISSED) || '[]');
    } catch {
      /* yoksay */
    }
    setNotifications((prev) => {
      const ids = new Set([...prev.map((n) => n.id), ...dismissed]);
      const add: BudgetNotification[] = due
        .map((c) => ({
          id: `stmt-${c.id}-${lastStatementKey(c)}`,
          type: 'statement_reminder' as const,
          title: `Yeni ekstre: ${c.name.toLocaleLowerCase('tr-TR').includes(c.bank.toLocaleLowerCase('tr-TR')) ? c.name : `${c.bank} ${c.name}`}`,
          message: `Hesap kesildi. Kartlar sekmesinden ekstre PDF'ini yükleyin; borç ve harcamalar güncellensin.`,
          timestamp: new Date().toISOString(),
          read: false
        }))
        .filter((n) => !ids.has(n.id));
      return add.length ? [...add, ...prev] : prev;
    });
  }, [creditCards]);

  // Eski varsayılan isim "Şakir (Ben)" -> "Emre". Buluttan eski adla gelen veri de düzeltilir;
  // değişiklik normal eşitlemeyle diğer cihazlara gider.
  useEffect(() => {
    const OLD_NAME = 'Şakir (Ben)';
    const NEW_NAME = 'Emre';
    const fix = <T extends { member: string }>(list: T[]) =>
      list.some((x) => x.member === OLD_NAME) ? list.map((x) => (x.member === OLD_NAME ? { ...x, member: NEW_NAME } : x)) : list;
    if (familyMembers.some((m) => m.name === OLD_NAME)) {
      setFamilyMembers((prev) => prev.map((m) => (m.name === OLD_NAME ? { ...m, name: NEW_NAME } : m)));
    }
    if (transactions.some((x) => x.member === OLD_NAME)) setTransactions(fix);
    if (installments.some((x) => x.member === OLD_NAME)) setInstallments(fix);
    if (creditCards.some((x) => x.member === OLD_NAME)) setCreditCards(fix);
  }, [familyMembers, transactions, installments, creditCards]);

  // Zamanlayıcılar ve olay dinleyicileri her zaman en güncel veriyle gönderebilsin
  const syncToCloudRef = useRef(syncToCloud);
  syncToCloudRef.current = syncToCloud;
  const syncFromCloudRef = useRef(syncFromCloud);
  syncFromCloudRef.current = syncFromCloud;
  const syncConfigRef = useRef(syncConfig);
  syncConfigRef.current = syncConfig;

  // Auto-sync debounce
  useEffect(() => {
    if (skipNextAutoPushRef.current) {
      skipNextAutoPushRef.current = false;
      return;
    }
    // Yerel değişiklik: gönderilene kadar işaretli kalır, uygulama kapansa bile sonra yeniden denenir
    setDirty(true);
    if (!syncConfig.autoSync) return;
    const timer = setTimeout(() => {
      syncToCloud();
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [transactions, categoryLimits, savingsGoals, familyMembers, installments, creditCards, recurring, assets, assetHistory, currency, syncConfig.autoSync, syncToCloud]);

  // Diğer cihazların değişikliklerini al: açılışta, sekmeye dönünce ve düzenli aralıklarla
  useEffect(() => {
    if (!syncConfig.autoSync || !syncConfig.vaultId) return;
    let pulling = false;
    // Gönderilmemiş yerel değişiklik varsa önce onu gönder (gönderim zaten önce bulutu kontrol eder),
    // yoksa yalnızca buluttaki yeni sürümü çek.
    const pull = () => {
      if (pulling) return;
      pulling = true;
      const run = dirtyRef.current ? syncToCloudRef.current() : pullIfNewer();
      run
        .catch((err) => console.warn('Otomatik eşitleme başarısız:', err))
        .finally(() => {
          pulling = false;
        });
    };
    // Diğer cihaz kaydettiği anda Supabase Realtime sinyaliyle haber verir
    const live = syncConfig.vaultId ? connectVaultLive(syncConfig.vaultId, pull) : null;
    liveLinkRef.current = live;

    pull();
    const interval = setInterval(pull, PULL_INTERVAL_MS);
    const onVisibility = () => {
      // Arka plana geçerken bekleyen değişikliği hemen gönder; öne gelince eşitle
      if (document.visibilityState === 'visible' || dirtyRef.current) pull();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', pull);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', pull);
      live?.close();
      if (liveLinkRef.current === live) liveLinkRef.current = null;
    };
  }, [syncConfig.autoSync, syncConfig.vaultId, pullIfNewer]);

  // Kasayı yeni (güçlü) bir anahtarla yeniden şifreler; eski anahtar artık ne okuyabilir ne yazabilir.
  // Diğer cihazların yeni anahtarla yeniden bağlanması gerekir.
  const rotatePassphrase = async (): Promise<string> => {
    if (!(await syncToCloud()) || !baseRef.current) {
      throw new Error('Önce bulutla eşitleme yapılamadı; internet bağlantısını kontrol edip tekrar deneyin.');
    }
    const newPassphrase = generateMasterPassphrase();
    await pushPayload({ ...baseRef.current, updatedAt: new Date().toISOString() }, newPassphrase);
    setSyncConfig((prev) => ({
      ...prev,
      passphrase: newPassphrase,
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      remoteUpdatedAt: remoteUpdatedAtRef.current,
      errorMessage: undefined
    }));
    return newPassphrase;
  };

  // Bu cihaz için yeni boş kasa açar; cihazdaki veriler ilk gönderimle kasaya yazılır
  const createNewVault = () => {
    setDirty(true);
    setSyncConfig((prev) => ({
      ...prev,
      vaultId: generateVaultId(),
      passphrase: generateMasterPassphrase(),
      status: 'synced',
      errorMessage: undefined,
      remoteUpdatedAt: undefined
    }));
  };

  const updateSyncCredentials = (vaultId: string, passphrase: string, autoSync: boolean) => {
    setSyncConfig((prev) => ({
      ...prev,
      vaultId,
      passphrase,
      autoSync
    }));
  };

  // Export encrypted JSON file for cold storage backup
  const exportEncryptedVault = async () => {
    const payload: CloudVaultPayload = {
      version: 2,
      updatedAt: new Date().toISOString(),
      transactions,
      categoryLimits,
      savingsGoals,
      familyMembers,
      installments,
      creditCards,
      recurring,
      assets,
      assetHistory,
      currency
    };
    const encrypted = await encryptData(payload, syncConfig.passphrase);
    const backupFile = {
      app: 'AilveFamilyBudget',
      vaultId: syncConfig.vaultId,
      encrypted,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ailve-butce-yedek-${new Date().toISOString().split('T')[0]}.enc.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export plain CSV
  const exportCsv = () => {
    const headers = ['ID', 'Tarih', 'Tur', 'Kategori', 'Tutar', 'Para Birimi', 'Aile Uyesi', 'Odeme Yontemi', 'Aciklama', 'Tekrarlayan'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type === 'income' ? 'Gelir' : t.type === 'saving' ? 'Birikim' : 'Gider',
      `"${t.category}"`,
      t.amount,
      t.currency,
      `"${t.member}"`,
      `"${t.paymentMethod}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.isRecurring ? 'Evet' : 'Hayir'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ailve-butce-hareketleri-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import backup
  // Doldurulmuş Excel şablonunu yükler. Aynı adlı kayıtlar güncellenir, diğerleri eklenir.
  // Kart borcu Excel'deki "Güncel Toplam Borç" ile gelir; kartlı tek seferlik harcamalar borca ayrıca eklenmez.
  const importExcel = async (file: File): Promise<string> => {
    const sheets = await readXlsx(file);
    const result = buildImportFromSheets(sheets, {
      members: familyMembers.map((m) => m.name),
      existingCards: creditCards
    });
    const upsert = <T extends { id: string }>(prev: T[], incoming: T[]) =>
      incoming.length ? [...prev.filter((p) => !incoming.some((n) => n.id === p.id)), ...incoming] : prev;
    setCreditCards((prev) => upsert(prev, result.creditCards));
    setInstallments((prev) => upsert(prev, result.installments));
    setRecurring((prev) => upsert(prev, result.recurring));
    setTransactions((prev) => upsert(prev, result.transactions).sort((a, b) => b.date.localeCompare(a.date)));
    const summary = [
      result.recurring.filter((r) => r.type === 'income').length && `${result.recurring.filter((r) => r.type === 'income').length} gelir`,
      result.recurring.filter((r) => r.type !== 'income').length && `${result.recurring.filter((r) => r.type !== 'income').length} sabit gider`,
      result.creditCards.length && `${result.creditCards.length} kart`,
      result.installments.length && `${result.installments.length} taksitli borç`,
      result.transactions.length && `${result.transactions.length} işlem`
    ]
      .filter(Boolean)
      .join(', ');
    const message = `${summary || 'Hiç kayıt bulunamadı'} yüklendi.${result.warnings.length ? `\n\nUyarılar:\n- ${result.warnings.join('\n- ')}` : ''}`;
    setNotifications((prev) => [
      {
        id: `excel-ok-${Date.now()}`,
        type: 'sync_success',
        title: "Excel'den Yüklendi",
        message: `${summary || 'Hiç kayıt bulunamadı'} yüklendi.`,
        timestamp: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
    return message;
  };

  // Sunucudaki otomatik yedeği geri yükler: yedekteki hal bu cihazın değişikliği sayılır ve buluta yazılır,
  // böylece tüm cihazlar yedeğe döner.
  const importTransactions = (txs: Transaction[]) => {
    const existing = new Set(transactions.map((t) => t.id));
    const fresh = txs.filter((t) => !existing.has(t.id));
    if (fresh.length) setTransactions((prev) => [...prev, ...fresh].sort((a, b) => b.date.localeCompare(a.date)));
    return fresh.length;
  };

  const restoreBackup = async (slot: string) => {
    const record = await loadVaultBackup(syncConfig.vaultId, slot);
    const payload = await decryptRecord(record, syncConfig.passphrase);
    applyPayload(payload);
    // Değişen veriler otomatik eşitlemeyle hemen buluta gider (applyPayload'ın "gönderme" işaretini kaldır)
    skipNextAutoPushRef.current = false;
    setDirty(true);
  };

  const importVaultBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.encrypted) {
        // Encrypted backup
        const decrypted: CloudVaultPayload = await decryptData(parsed.encrypted, syncConfig.passphrase);
        if (decrypted && decrypted.transactions) {
          setTransactions(decrypted.transactions);
          if (decrypted.categoryLimits) setCategoryLimits(decrypted.categoryLimits);
          if (decrypted.savingsGoals) setSavingsGoals(decrypted.savingsGoals);
          if (decrypted.familyMembers) setFamilyMembers(decrypted.familyMembers);
          if (decrypted.installments) setInstallments(decrypted.installments); if (decrypted.creditCards) setCreditCards(decrypted.creditCards); if (decrypted.recurring) setRecurring(decrypted.recurring);
          if (decrypted.currency) setCurrencyState(decrypted.currency);

          setNotifications((prev) => [
            {
              id: `import-ok-${Date.now()}`,
              type: 'sync_success',
              title: 'Yedek Başarıyla Yüklendi',
              message: 'Şifreli dosyadaki tüm bütçe verileriniz başarıyla çözümlendi ve geri yüklendi.',
              timestamp: new Date().toISOString(),
              read: false
            },
            ...prev
          ]);
        }
      } else if (parsed.app === 'CebimImport') {
        // Hazır veri dosyası: taksit listesini değiştirir, düzenli kalemleri ekler/günceller.
        // Kartlar ve işlemler olduğu gibi kalır.
        if (Array.isArray(parsed.installments)) setInstallments(parsed.installments);
        if (Array.isArray(parsed.recurring)) {
          const incoming: RecurringItem[] = parsed.recurring;
          setRecurring((prev) => [...prev.filter((r) => !incoming.some((n) => n.id === r.id)), ...incoming]);
        }
        if (Array.isArray(parsed.creditCards)) {
          const incoming: CreditCardAccount[] = parsed.creditCards;
          setCreditCards((prev) => [...prev.filter((c) => !incoming.some((n) => n.id === c.id)), ...incoming]);
        }
        setNotifications((prev) => [
          {
            id: `import-ok-${Date.now()}`,
            type: 'sync_success',
            title: 'Veriler Yüklendi',
            message: `${parsed.installments?.length ?? 0} taksit ve ${parsed.recurring?.length ?? 0} düzenli gelir/gider eklendi.`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...prev
        ]);
      } else if (Array.isArray(parsed)) {
        // Plain transactions array
        setTransactions(parsed);
      }
    } catch (err: any) {
      alert(`Yedek yükleme hatası: ${err.message || 'Geçersiz dosya veya anahtar.'}`);
    }
  };

  // Transaction mutations
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    setTransactions((prev) => [newTx, ...prev]);
    applyGoalSaving(newTx, 1);
    applyCardDebt(newTx, 1);
  };

  // Karta bağlı harcama kartın borcunu artırır/azaltır
  const applyCardDebt = (tx: Transaction | undefined, sign: 1 | -1) => {
    if (!tx || tx.type !== 'expense' || !tx.cardId) return;
    const amount = convertCurrency(tx.amount, tx.currency, 'TRY');
    setCreditCards((prev) =>
      prev.map((c) =>
        c.id === tx.cardId ? { ...c, currentDebt: Math.max(0, Math.round((c.currentDebt + sign * amount) * 100) / 100) } : c
      )
    );
  };

  // Kart borcu ödemesi: borcu düşürür; istenirse ödemeyi gider olarak da kaydeder
  // (kartla yapılan harcamalar uygulamaya ayrıca girilmediyse gider ancak böyle görünür)
  const payCardDebt = (cardId: string, amount: number, recordAsExpense: boolean) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card || !(amount > 0)) return;
    const round = (n: number) => Math.max(0, Math.round(n * 100) / 100);
    setCreditCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, currentDebt: round(c.currentDebt - amount), statementDebt: round((c.statementDebt ?? c.currentDebt) - amount) }
          : c
      )
    );
    if (recordAsExpense) {
      const today = new Date();
      addTransaction({
        type: 'expense',
        amount,
        currency: 'TRY',
        category: 'Borç & Kredi',
        member: card.member,
        date: new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0],
        description: `${card.bank} ${card.name} kart borcu ödemesi`,
        paymentMethod: 'Havale/EFT'
      });
    }
  };

  // Hedefe bağlı birikim işlemi hedefin biriken tutarını artırır/azaltır
  const applyGoalSaving = (tx: Transaction | undefined, sign: 1 | -1) => {
    if (!tx || tx.type !== 'saving' || !tx.goalId) return;
    const goal = savingsGoals.find((g) => g.id === tx.goalId);
    if (!goal) return;
    depositToGoal(goal.id, sign * convertCurrency(tx.amount, tx.currency, goal.currency));
  };

  const updateTransaction = (updatedTx: Transaction) => {
    const old = transactions.find((t) => t.id === updatedTx.id);
    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
    applyGoalSaving(old, -1);
    applyGoalSaving(updatedTx, 1);
    applyCardDebt(old, -1);
    applyCardDebt(updatedTx, 1);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    applyGoalSaving(tx, -1);
    applyCardDebt(tx, -1);
    // Düzenli işlem silinirse o ay için yeniden oluşturulmaz
    const recMatch = id.match(/^rec-(.+)-(\d{4}-\d{2})$/);
    if (recMatch) {
      const recId = recMatch[1];
      const month = tx ? budgetMonthOf(tx) : recMatch[2];
      setRecurring((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, skipMonths: [...(r.skipMonths || []), month].slice(-24) } : r))
      );
    }
    // Taksit ödemesi silinirse taksit sayacı da geri alınır
    const instId = tx?.installmentInfo?.installmentId;
    if (instId) {
      setInstallments((prev) =>
        prev.map((i) => {
          if (i.id !== instId) return i;
          const paid = Math.max(0, (i.paidInstallments || 0) - 1);
          const total = i.schedule ? i.schedule.length : i.totalInstallments;
          return {
            ...i,
            paidInstallments: paid,
            remainingInstallments: total ? total - paid : i.remainingInstallments,
            // Değişken planda ödenen dönem tekrar ödenmemiş olur
            schedule: i.schedule?.map((s) => (s.period === tx?.installmentInfo?.current ? { ...s, paid: false } : s))
          };
        })
      );
    }
  };

  // Savings Goal mutations
  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `g-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSavingsGoals((prev) => [...prev, newGoal]);
  };

  const updateSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
  };

  const depositToGoal = (id: string, amount: number) => {
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const newCurrent = Math.max(0, g.currentAmount + amount);
        if (newCurrent >= g.targetAmount && g.currentAmount < g.targetAmount) {
          // Add achievement notification
          setNotifications((n) => [
            {
              id: `goal-reached-${g.id}-${Date.now()}`,
              type: 'goal_reached',
              title: `Tebrikler! Hedef Tamamlandı 🎉`,
              message: `"${g.title}" tasarruf hedefinize ulaştınız (${formatCurrency(newCurrent, g.currency)})!`,
              timestamp: new Date().toISOString(),
              read: false
            },
            ...n
          ]);
        }
        return { ...g, currentAmount: newCurrent };
      })
    );
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Category Limit mutations
  const updateCategoryLimit = (limit: CategoryLimit) => {
    setCategoryLimits((prev) => prev.map((l) => (l.id === limit.id ? limit : l)));
  };

  const addCategoryLimit = (limit: Omit<CategoryLimit, 'id'>) => {
    const newLimit: CategoryLimit = {
      ...limit,
      id: `l-${Date.now()}`
    };
    setCategoryLimits((prev) => [...prev, newLimit]);
  };

  const deleteCategoryLimit = (id: string) => {
    setCategoryLimits((prev) => prev.filter((l) => l.id !== id));
  };

  const addFamilyMember = (member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...member,
      id: `m-${Date.now()}`
    };
    setFamilyMembers((prev) => [...prev, newMember]);
  };

  const addInstallment = (inst: Omit<InstallmentDebt, 'id'>) => {
    const newInst: InstallmentDebt = {
      ...inst,
      id: `inst-${Date.now()}`
    };
    setInstallments((prev) => [newInst, ...prev]);
  };

  const updateInstallment = (inst: InstallmentDebt) => {
    setInstallments((prev) => prev.map((i) => (i.id === inst.id ? inst : i)));
  };

  const addCreditCard = (card: Omit<CreditCardAccount, 'id'>) => {
    setCreditCards((prev) => [...prev, { ...card, id: `card-${Date.now()}` }]);
  };

  const updateCreditCard = (card: CreditCardAccount) => {
    setCreditCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
  };

  const deleteCreditCard = (id: string) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
  };

  const saveAsset = (asset: Omit<AssetHolding, 'id' | 'updatedAt'> & { id?: string }) => {
    const item: AssetHolding = { ...asset, id: asset.id || `asset-${Date.now()}`, updatedAt: new Date().toISOString() };
    setAssets((prev) => (prev.some((a) => a.id === item.id) ? prev.map((a) => (a.id === item.id ? item : a)) : [...prev, item]));
  };

  // Günde bir kayıt; değer %0,5'ten az değiştiyse yazmaz (gereksiz eşitleme olmasın)
  const recordAssetSnapshot = (totalTl: number) => {
    if (!(totalTl >= 0)) return;
    const id = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setAssetHistory((prev) => {
      const today = prev.find((s) => s.id === id);
      if (today && Math.abs(today.total - totalTl) <= Math.max(1, today.total * 0.005)) return prev;
      const total = Math.round(totalTl);
      return [...prev.filter((s) => s.id !== id), { id, total }].sort((a, b) => a.id.localeCompare(b.id)).slice(-730);
    });
  };

  const deleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const addRecurring = (item: Omit<RecurringItem, 'id'>) => {
    setRecurring((prev) => [...prev, { ...item, id: `rec-${Date.now()}` }]);
  };

  const updateRecurring = (item: RecurringItem) => {
    setRecurring((prev) => prev.map((r) => (r.id === item.id ? item : r)));
  };

  const deleteRecurring = (id: string) => {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  };

  const deleteInstallment = (id: string) => {
    setInstallments((prev) => prev.filter((i) => i.id !== id));
  };

  const currentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Bu ay için kaydedilmiş taksit ödemesi (harcama kaydı)
  const getInstallmentPaymentThisMonth = (id: string): Transaction | undefined =>
    transactions.find((t) => t.installmentInfo?.installmentId === id && t.date.startsWith(currentMonthKey()));

  // Taksiti öder: sayacı artırır ve özette/analizde görünmesi için bir harcama kaydı ekler
  const markInstallmentPaid = (id: string, periodNumber?: number) => {
    const inst = installments.find((i) => i.id === id);
    if (!inst) return;
    if (getInstallmentPaymentThisMonth(id)) return;

    // Değişken tutarlı plan (ör. Eminevim): sıradaki ödenmemiş dönemin tutarı ödenir
    const scheduleItem = inst.schedule
      ? inst.schedule.find((s) => (periodNumber !== undefined ? s.period === periodNumber : !s.paid))
      : undefined;
    if (inst.schedule && !scheduleItem) return;

    const paid = (inst.paidInstallments || 0) + 1;
    const total = inst.schedule ? inst.schedule.length : inst.totalInstallments;
    setInstallments((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return {
          ...i,
          paidInstallments: paid,
          remainingInstallments: total ? Math.max(0, total - paid) : i.remainingInstallments,
          schedule: i.schedule?.map((s) => (s.period === scheduleItem?.period ? { ...s, paid: true } : s))
        };
      })
    );

    const creditor = inst.creditor.toLocaleLowerCase('tr-TR');
    const paidByCard = creditCards.some((c) => creditor.includes(c.bank.toLocaleLowerCase('tr-TR')));
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const label = scheduleItem ? `${scheduleItem.period}. dönem` : total ? `${paid}/${total}` : '';
    addTransaction({
      type: 'expense',
      amount: scheduleItem ? scheduleItem.amount : inst.monthlyAmount,
      currency: 'TRY',
      category: 'Borç & Kredi',
      member: inst.member,
      date: localDate,
      description: `${inst.title} taksiti${label ? ` (${label})` : ''}`,
      // Kredi/taksit ödemesi hesaptan yapılır (kart ekstresine giren taksitler kart ödemesiyle zaten öder)
      paymentMethod: paidByCard && /kart/i.test(`${inst.title} ${inst.notes ?? ''}`) ? 'Kredi Kartı' : 'Havale/EFT',
      installmentInfo: { current: scheduleItem ? scheduleItem.period : paid, total: total || 0, installmentId: id }
    });
  };

  const undoInstallmentPayment = (id: string) => {
    const tx = getInstallmentPaymentThisMonth(id);
    if (tx) deleteTransaction(tx.id);
  };

  // Kapatılan ekstre hatırlatmaları yeniden eklenmesin
  const rememberDismissed = (ids: string[]) => {
    try {
      const old: string[] = JSON.parse(localStorage.getItem(LS_DISMISSED) || '[]');
      localStorage.setItem(LS_DISMISSED, JSON.stringify([...new Set([...old, ...ids.filter((i) => i.startsWith('stmt-'))])].slice(-100)));
    } catch {
      /* yoksay */
    }
  };

  const dismissNotification = (id: string) => {
    rememberDismissed([id]);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    rememberDismissed(notifications.map((n) => n.id));
    setNotifications([]);
  };

  // İşlemleri, taksitleri, hedefleri ve limitleri boşaltır. Aile üyeleri, para birimi ve
  // kasa bağlantısı korunur; boş hal otomatik eşitlemeyle diğer cihazlara da gider.
  const resetAllData = () => {
    setTransactions([]);
    setInstallments([]);
    setCreditCards([]);
    setRecurring([]);
    setAssets([]);
    setAssetHistory([]);
    setSavingsGoals([]);
    setCategoryLimits([]);
    setNotifications([]);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type
      if (filterType !== 'all' && tx.type !== filterType) return false;
      // Category
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
      // Member
      if (filterMember !== 'all' && tx.member !== filterMember) return false;
      // Search
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesCat = tx.category.toLowerCase().includes(q);
        const matchesMember = tx.member.toLowerCase().includes(q);
        const matchesPay = tx.paymentMethod.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesMember && !matchesPay) return false;
      }
      // Date Range
      if (filterDateRange !== 'all') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (filterDateRange === 'this_month') {
          // Ay seçicide seçili ay (varsayılan bu ay)
          if (budgetMonthOf(tx) !== selectedMonth) return false;
        } else if (filterDateRange === 'last_month') {
          if (budgetMonthOf(tx) !== shiftMonthKey(selectedMonth, -1)) return false;
        } else if (filterDateRange === 'last_3_months') {
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          if (txDate < threeMonthsAgo) return false;
        } else if (filterDateRange === 'this_year') {
          if (txDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [transactions, filterType, filterCategory, filterMember, filterQuery, filterDateRange, selectedMonth]);

  const value: BudgetContextValue = {
    transactions,
    categoryLimits,
    savingsGoals,
    familyMembers,
    installments,
    currency,
    notifications,
    syncConfig,
    selectedMonth,
    setSelectedMonth,
    deviceMode,
    effectiveDevice,
    darkMode,
    filterQuery,
    setFilterQuery,
    filterCategory,
    setFilterCategory,
    filterMember,
    setFilterMember,
    filterType,
    setFilterType,
    filterDateRange,
    setFilterDateRange,
    filteredTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSavingsGoal,
    updateSavingsGoal,
    depositToGoal,
    deleteSavingsGoal,
    updateCategoryLimit,
    addCategoryLimit,
    deleteCategoryLimit,
    addFamilyMember,
    addInstallment,
    updateInstallment,
    creditCards,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    payCardDebt,
    recurring,
    assets,
    assetHistory,
    recordAssetSnapshot,
    saveAsset,
    deleteAsset,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    deleteInstallment,
    markInstallmentPaid,
    undoInstallmentPayment,
    isInstallmentPaidThisMonth: (id: string) => Boolean(getInstallmentPaymentThisMonth(id)),
    setCurrency,
    setDeviceMode,
    toggleDarkMode,
    dismissNotification,
    clearAllNotifications,
    resetAllData,
    syncToCloud,
    rotatePassphrase,
    syncFromCloud,
    updateSyncCredentials,
    createNewVault,
    exportEncryptedVault,
    exportCsv,
    importVaultBackup,
    importExcel,
    restoreBackup,
    importTransactions,
    monthlyIncome,
    monthlyExpense,
    monthlyCardSpend,
    monthlySavings,
    monthlyBalance,
    ratesVersion,
    savingsRate,
    categorySpendingMap
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudget = (): BudgetContextValue => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

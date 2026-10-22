import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Transaction,
  CategoryLimit,
  SavingsGoal,
  FamilyMember,
  InstallmentDebt,
  BudgetNotification,
  Currency,
  DeviceMode,
  CloudVaultPayload
} from '../types/budget';
import {
  DEFAULT_TRANSACTIONS,
  DEFAULT_CATEGORY_LIMITS,
  DEFAULT_SAVINGS_GOALS,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_INSTALLMENTS
} from '../data/initialData';
import {
  generateVaultId,
  generateMasterPassphrase,
  encryptData,
  decryptData
} from '../utils/crypto';
import { convertCurrency, formatCurrency } from '../utils/currencies';
import {
  saveVault,
  loadVault,
  VaultNotFoundError,
  EncryptedVaultRecord,
  connectVaultLive,
  VaultLiveLink
} from '../utils/cloudStore';

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
  filterType: 'all' | 'income' | 'expense';
  setFilterType: (t: 'all' | 'income' | 'expense') => void;
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
  deleteInstallment: (id: string) => void;
  markInstallmentPaid: (id: string, period?: number) => void;
  setCurrency: (c: Currency) => void;
  setDeviceMode: (m: DeviceMode) => void;
  toggleDarkMode: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Cloud & Encryption
  syncToCloud: () => Promise<boolean>;
  syncFromCloud: (customVaultId?: string, customPassphrase?: string) => Promise<boolean>;
  updateSyncCredentials: (vaultId: string, passphrase: string, autoSync: boolean) => void;
  exportEncryptedVault: () => Promise<void>;
  exportCsv: () => void;
  importVaultBackup: (file: File) => Promise<void>;

  // Calculated Metrics
  monthlyIncome: number;
  monthlyExpense: number;
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
const LS_CURRENCY = 'ailve_currency_v5';
const LS_SYNC = 'ailve_sync_v5';
const LS_THEME = 'ailve_theme_v5';
const LS_NOTIFICATIONS = 'ailve_notifications_v5';
const LS_DEVICE = 'ailve_device_mode_v5';

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(LS_TRANSACTIONS);
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  });

  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>(() => {
    const saved = localStorage.getItem(LS_LIMITS);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_LIMITS;
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem(LS_GOALS);
    return saved ? JSON.parse(saved) : DEFAULT_SAVINGS_GOALS;
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem(LS_MEMBERS);
    return saved ? JSON.parse(saved) : DEFAULT_FAMILY_MEMBERS;
  });

  const [installments, setInstallments] = useState<InstallmentDebt[]>(() => {
    const saved = localStorage.getItem(LS_INSTALLMENTS);
    return saved ? JSON.parse(saved) : DEFAULT_INSTALLMENTS;
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
    return {
      vaultId: generateVaultId(),
      passphrase: generateMasterPassphrase(),
      autoSync: true,
      status: 'synced',
      lastSyncedAt: new Date().toISOString()
    };
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LS_THEME);
    if (saved !== null) {
      return saved === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [deviceMode, setDeviceModeState] = useState<DeviceMode>(() => {
    const saved = localStorage.getItem(LS_DEVICE) as DeviceMode;
    return saved || 'auto';
  });

  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
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

  // Spend calculations for current month (or selected currency)
  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const categorySpendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.date.startsWith(currentMonthPrefix)) {
        const converted = convertCurrency(tx.amount, tx.currency, currency);
        map[tx.category] = (map[tx.category] || 0) + converted;
      }
    });
    return map;
  }, [transactions, currentMonthPrefix, currency]);

  // Monthly totals
  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((tx) => {
      if (tx.date.startsWith(currentMonthPrefix)) {
        const val = convertCurrency(tx.amount, tx.currency, currency);
        if (tx.type === 'income') inc += val;
        else exp += val;
      }
    });
    return { monthlyIncome: inc, monthlyExpense: exp };
  }, [transactions, currentMonthPrefix, currency]);

  const monthlyBalance = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100)) : 0;

  // Automated Category Limit Check & Notification generation
  const evaluateLimits = useCallback(
    (currentTxList: Transaction[], currentLimitList: CategoryLimit[]) => {
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Calculate spending for each category in current month
      const spending: Record<string, number> = {};
      currentTxList.forEach((tx) => {
        if (tx.type === 'expense' && tx.date.startsWith(currentYearMonth)) {
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

  const applyRemoteVault = useCallback(
    async (data: EncryptedVaultRecord, pass: string): Promise<CloudVaultPayload> => {
      const decrypted: CloudVaultPayload = await decryptData(
        {
          ciphertext: data.ciphertext,
          iv: data.iv,
          salt: data.salt
        },
        pass
      );
      if (!decrypted || !decrypted.transactions) {
        throw new Error('Geçersiz kasa veri yapısı.');
      }

      skipNextAutoPushRef.current = true;
      setTransactions(decrypted.transactions);
      if (decrypted.categoryLimits) setCategoryLimits(decrypted.categoryLimits);
      if (decrypted.savingsGoals) setSavingsGoals(decrypted.savingsGoals);
      if (decrypted.familyMembers) setFamilyMembers(decrypted.familyMembers);
      if (decrypted.currency) setCurrencyState(decrypted.currency);

      remoteUpdatedAtRef.current = data.updatedAt;
      return decrypted;
    },
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

    await applyRemoteVault(remote, syncConfig.passphrase);
    setSyncConfig((prev) => ({
      ...prev,
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      remoteUpdatedAt: remoteUpdatedAtRef.current,
      errorMessage: undefined
    }));
    return true;
  }, [syncConfig.vaultId, syncConfig.passphrase, applyRemoteVault]);

  // Synchronize to cloud backend
  const syncToCloud = useCallback(async (): Promise<boolean> => {
    if (!syncConfig.vaultId || !syncConfig.passphrase) {
      setSyncConfig((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Kasa kimliği ve şifreleme anahtarı eksik.'
      }));
      return false;
    }

    setSyncConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));

    try {
      // Başka bir cihaz daha yeni veri yüklediyse üzerine yazma; önce onu çek.
      if (await pullIfNewer()) {
        return true;
      }

      const payload: CloudVaultPayload = {
        version: 2,
        updatedAt: new Date().toISOString(),
        transactions,
        categoryLimits,
        savingsGoals,
        familyMembers,
        currency
      };

      // Perform End-to-End Encryption
      const encrypted = await encryptData(payload, syncConfig.passphrase);

      const serverUpdatedAt = await saveVault(syncConfig.vaultId, {
        ...encrypted,
        version: payload.version,
        updatedAt: payload.updatedAt,
        clientInfo: `Ailve-${effectiveDevice}`
      });
      remoteUpdatedAtRef.current = serverUpdatedAt ?? payload.updatedAt;
      liveLinkRef.current?.notifyUpdated(remoteUpdatedAtRef.current);

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
          errorMessage: 'Geçerli bir Kasa Kodu ve Şifreleme Anahtarı giriniz.'
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

  // Auto-connect when opened via QR code or shared link with ?vault=...&key=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlVault = params.get('vault');
    const urlKey = params.get('key');

    if (urlVault && urlKey) {
      console.log('🔗 Link üzerinden kasa algılandı, bağlanılıyor:', urlVault);
      syncFromCloud(urlVault, urlKey).then(() => {
        // Clean URL to protect passphrase in address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, [syncFromCloud]);

  // Auto-sync debounce
  useEffect(() => {
    if (!syncConfig.autoSync) return;
    if (skipNextAutoPushRef.current) {
      skipNextAutoPushRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      syncToCloud();
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [transactions, categoryLimits, savingsGoals, familyMembers, currency, syncConfig.autoSync, syncToCloud]);

  // Diğer cihazların değişikliklerini al: açılışta, sekmeye dönünce ve düzenli aralıklarla
  useEffect(() => {
    if (!syncConfig.autoSync) return;
    let pulling = false;
    const pull = () => {
      if (pulling) return;
      pulling = true;
      pullIfNewer()
        .catch((err) => console.warn('Buluttan otomatik çekme başarısız:', err))
        .finally(() => {
          pulling = false;
        });
    };
    // Diğer cihaz kaydettiği anda Supabase Realtime sinyaliyle haber verir
    const live = syncConfig.vaultId ? connectVaultLive(syncConfig.vaultId, pull) : null;
    liveLinkRef.current = live;

    pull();
    const interval = setInterval(pull, PULL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      live?.close();
      if (liveLinkRef.current === live) liveLinkRef.current = null;
    };
  }, [syncConfig.autoSync, syncConfig.vaultId, pullIfNewer]);

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
      t.type === 'income' ? 'Gelir' : 'Gider',
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
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
        const newCurrent = g.currentAmount + amount;
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

  const deleteInstallment = (id: string) => {
    setInstallments((prev) => prev.filter((i) => i.id !== id));
  };

  const markInstallmentPaid = (id: string, periodNumber?: number) => {
    setInstallments((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.schedule && periodNumber !== undefined) {
          const updatedSchedule = i.schedule.map((s) =>
            s.period === periodNumber ? { ...s, paid: true } : s
          );
          return { ...i, schedule: updatedSchedule };
        }
        const paid = (i.paidInstallments || 0) + 1;
        const rem = Math.max(0, (i.remainingInstallments || 1) - 1);
        return { ...i, paidInstallments: paid, remainingInstallments: rem };
      })
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
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
          if (txDate.getFullYear() !== now.getFullYear() || txDate.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (filterDateRange === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (txDate.getFullYear() !== lastMonth.getFullYear() || txDate.getMonth() !== lastMonth.getMonth()) {
            return false;
          }
        } else if (filterDateRange === 'last_3_months') {
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          if (txDate < threeMonthsAgo) return false;
        } else if (filterDateRange === 'this_year') {
          if (txDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [transactions, filterType, filterCategory, filterMember, filterQuery, filterDateRange]);

  const value: BudgetContextValue = {
    transactions,
    categoryLimits,
    savingsGoals,
    familyMembers,
    installments,
    currency,
    notifications,
    syncConfig,
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
    deleteInstallment,
    markInstallmentPaid,
    setCurrency,
    setDeviceMode,
    toggleDarkMode,
    dismissNotification,
    clearAllNotifications,
    syncToCloud,
    syncFromCloud,
    updateSyncCredentials,
    exportEncryptedVault,
    exportCsv,
    importVaultBackup,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance,
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

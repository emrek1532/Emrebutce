import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab } from '../../types/budget';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { APP_VERSION } from '../../version';
import { applyUpdate, fetchLiveVersion } from '../../utils/appUpdate';
import { ArrowLeftRight, BarChart3, CreditCard, Home, Landmark, PiggyBank, ShieldCheck, Smartphone, Wallet, ArrowRight, BookOpen } from 'lucide-react';

const ICONS: Record<ActiveTab, React.ElementType> = {
  overview: Home,
  transactions: ArrowLeftRight,
  reports: BarChart3,
  cards: CreditCard,
  installments: Landmark,
  goals: PiggyBank,
  guide: BookOpen
};

// Tablet ve bilgisayarda sol menü (tablette yalnızca simgeler)
export const Sidebar: React.FC<{ onOpenSync: () => void; onOpenShare: () => void }> = ({ onOpenSync, onOpenShare }) => {
  const { syncConfig } = useBudget();
  const [activeTab, setActiveTab] = useActiveTab();
  const item = (active: boolean) =>
    `w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
      active
        ? 'bg-gradient-to-r from-[#116bc7] to-[#1687ed] text-white shadow-md shadow-blue-950/25'
        : 'text-blue-100 dark:text-blue-100 hover:bg-white/10 hover:text-white'
    }`;
  const syncColor = syncConfig.status === 'error' ? 'text-rose-500' : syncConfig.status === 'syncing' ? 'text-amber-500 animate-pulse' : 'text-sky-600 dark:text-sky-400';

  return (
    <aside className="sticky top-0 h-screen shrink-0 w-[4.75rem] xl:w-60 flex flex-col border-r border-[#07365c] bg-gradient-to-b from-[#06355f] via-[#07315a] to-[#052747] text-white px-2.5 xl:px-4 py-5">
      <button type="button" onClick={() => setActiveTab('overview')} className="flex flex-col items-center gap-2 mb-8">
        <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-gradient-to-br from-[#1687ee] to-[#0951a3] text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
          <Wallet className="w-6 h-6 xl:w-8 xl:h-8" />
        </div>
        <span className="hidden xl:block text-2xl font-extrabold tracking-tight text-white">Cebim</span>
      </button>

      <nav className="space-y-1">
        {TABS.map((t) => {
          const Icon = ICONS[t.id];
          return (
            <button key={t.id} type="button" title={t.label} onClick={() => setActiveTab(t.id)} className={item(activeTab === t.id)}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden xl:inline">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="my-5 border-t border-white/15" />

      <div className="space-y-1.5">
        <button type="button" title="Eşitleme ve Yedek" onClick={onOpenSync} className={item(false)}>
          <ShieldCheck className={`w-5 h-5 shrink-0 ${syncColor}`} />
          <span className="hidden xl:inline">
            {syncConfig.status === 'error' ? 'Eşitlenemedi' : syncConfig.status === 'syncing' ? 'Eşitleniyor…' : 'Eşitleme & Yedek'}
          </span>
        </button>
        <button type="button" title="Kullanım Kılavuzu" onClick={() => setActiveTab('guide')} className={item(activeTab === 'guide')}>
          <BookOpen className="w-5 h-5 shrink-0" />
          <span className="hidden xl:inline">Kullanım Kılavuzu</span>
        </button>
        <button type="button" title="Telefona bağla" onClick={onOpenShare} className={`${item(false)} xl:hidden`}>
          <Smartphone className="w-5 h-5 shrink-0" />
        </button>
      </div>

      <div className="hidden xl:block mt-auto relative overflow-hidden rounded-2xl p-4 bg-white/10 border border-white/15">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-sky-200/50 dark:bg-sky-800/30" />
        <Smartphone className="relative w-6 h-6 text-sky-600 mb-2" />
        <p className="relative text-sm font-bold text-white leading-snug">Telefonunda da kullan</p>
        <p className="relative text-[11px] text-blue-100/80 mt-1">Linki paylaş, eşinle aynı bütçeyi gör.</p>
        <button
          type="button"
          onClick={onOpenShare}
          className="relative mt-3 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
        >
          Bağla <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={async () => {
          const live = await fetchLiveVersion();
          if (live && live !== APP_VERSION) {
            if (confirm(`Yeni sürüm hazır: v${live}. Şimdi güncellensin mi?`)) applyUpdate();
          } else if (live) alert(`Güncelsin: v${APP_VERSION}`);
          else if (confirm('Sürüm kontrol edilemedi. Önbelleği temizleyip yeniden yüklensin mi?')) applyUpdate();
        }}
        className="mt-auto xl:mt-3 text-center text-[10px] font-medium text-blue-100/70 hover:text-white"
        title="Güncellemeleri denetle"
      >
        <span className="hidden xl:inline">Cebim </span>v{APP_VERSION}
      </button>
    </aside>
  );
};

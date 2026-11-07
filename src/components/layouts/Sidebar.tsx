import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { ActiveTab } from '../../types/budget';
import { TABS, useActiveTab } from '../../utils/activeTab';
import { ArrowLeftRight, BarChart3, CreditCard, Home, Landmark, PiggyBank, ShieldCheck, Smartphone, Wallet, ArrowRight } from 'lucide-react';

const ICONS: Record<ActiveTab, React.ElementType> = {
  overview: Home,
  transactions: ArrowLeftRight,
  reports: BarChart3,
  cards: CreditCard,
  installments: Landmark,
  goals: PiggyBank
};

// Tablet ve bilgisayarda sol menü (tablette yalnızca simgeler)
export const Sidebar: React.FC<{ onOpenSync: () => void; onOpenShare: () => void }> = ({ onOpenSync, onOpenShare }) => {
  const { syncConfig } = useBudget();
  const [activeTab, setActiveTab] = useActiveTab();
  const item = (active: boolean) =>
    `w-full flex items-center justify-center xl:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
      active
        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
    }`;
  const syncColor = syncConfig.status === 'error' ? 'text-rose-500' : syncConfig.status === 'syncing' ? 'text-amber-500 animate-pulse' : 'text-sky-600 dark:text-sky-400';

  return (
    <aside className="sticky top-0 h-screen shrink-0 w-20 xl:w-64 flex flex-col border-r border-neutral-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl px-3 xl:px-5 py-6">
      <button type="button" onClick={() => setActiveTab('overview')} className="flex flex-col items-center gap-2 mb-8">
        <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
          <Wallet className="w-6 h-6 xl:w-8 xl:h-8" />
        </div>
        <span className="hidden xl:block text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">Cebim</span>
      </button>

      <nav className="space-y-1.5">
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

      <div className="my-5 border-t border-neutral-200 dark:border-neutral-800" />

      <div className="space-y-1.5">
        <button type="button" title="Eşitleme ve Yedek" onClick={onOpenSync} className={item(false)}>
          <ShieldCheck className={`w-5 h-5 shrink-0 ${syncColor}`} />
          <span className="hidden xl:inline">
            {syncConfig.status === 'error' ? 'Eşitlenemedi' : syncConfig.status === 'syncing' ? 'Eşitleniyor…' : 'Eşitleme & Yedek'}
          </span>
        </button>
        <button type="button" title="Telefona bağla" onClick={onOpenShare} className={`${item(false)} xl:hidden`}>
          <Smartphone className="w-5 h-5 shrink-0" />
        </button>
      </div>

      <div className="hidden xl:block mt-auto relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-sky-950/60 dark:to-indigo-950/60 border border-sky-100 dark:border-sky-900">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-sky-200/50 dark:bg-sky-800/30" />
        <Smartphone className="relative w-6 h-6 text-sky-600 mb-2" />
        <p className="relative text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug">Telefonunda da kullan</p>
        <p className="relative text-[11px] text-neutral-500 mt-1">Linki paylaş, eşinle aynı bütçeyi gör.</p>
        <button
          type="button"
          onClick={onOpenShare}
          className="relative mt-3 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
        >
          Bağla <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};

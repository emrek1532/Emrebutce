import React, { useEffect, useMemo, useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import type { AssetHolding, AssetKind, AssetSnapshot } from '../../types/budget';
import { ASSET_LABELS, cachedPrices, fetchPrices, PriceSnapshot, unitPrice } from '../../utils/assetPrices';
import { convertCurrency, formatCurrency } from '../../utils/currencies';
import { Coins, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';

const KIND_ORDER: AssetKind[] = ['ayar22', 'ayar14', 'ayar18', 'has', 'ceyrek', 'yarim', 'tam', 'ata', 'gremse', 'ata5', 'gumus', 'USD', 'EUR', 'GBP', 'TRY'];

const amountText = (a: AssetHolding) => {
  const { unit } = ASSET_LABELS[a.kind];
  const n = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(a.amount);
  return unit === 'gr' || unit === 'adet' ? `${n} ${unit}` : `${unit}${n}`;
};

// Birikim sekmesinde elde tutulan altın, döviz ve TL birikimleri (Harem Altın alış fiyatıyla)
export const AssetsSection: React.FC = () => {
  const { assets, saveAsset, deleteAsset, familyMembers, currency, assetHistory, recordAssetSnapshot } = useBudget();
  const [prices, setPrices] = useState<PriceSnapshot | null>(cachedPrices());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AssetHolding | 'new' | null>(null);

  const refresh = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setPrices(await fetchPrices(force));
    } catch (e: any) {
      setError(e.message || 'Fiyatlar alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      [...assets]
        .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
        .map((a) => {
          const price = unitPrice(a.kind, prices);
          return { a, price, value: price === null ? null : price * a.amount };
        }),
    [assets, prices]
  );
  const total = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const byGroup = (g: 'altin' | 'doviz' | 'tl') =>
    rows.filter((r) => ASSET_LABELS[r.a.kind].group === g).reduce((s, r) => s + (r.value ?? 0), 0);
  const money = (tl: number) => formatCurrency(convertCurrency(tl, 'TRY', currency), currency);

  // Güncel fiyat varken toplam değeri günlük geçmişe yaz
  const allPriced = rows.every((r) => r.value !== null);
  useEffect(() => {
    if (prices && !error && allPriced && assets.length > 0) recordAssetSnapshot(total);
  }, [total, prices, error, allPriced, assets.length]);

  const priceTime = prices?.haremTime?.split(' ')[1]?.slice(0, 5);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" /> Varlıklarım
        </h3>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
        >
          <Plus className="w-4 h-4" /> Varlık Ekle
        </button>
      </div>

      {rows.length > 0 && (
      <div className="p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-sm">
        <div className="absolute -right-12 -top-14 w-44 h-44 rounded-full bg-white/15 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-white/85">Toplam değer</span>
            <div className="text-3xl font-extrabold font-mono tracking-tight">{money(total)}</div>
          </div>
          <button
            type="button"
            onClick={() => refresh(true)}
            title="Fiyatları yenile"
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {prices ? `Harem alış · ${priceTime ?? ''}` : 'Fiyat yok'}
          </button>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-4 text-[11px]">
          {(
            [
              ['Altın', 'altin'],
              ['Döviz', 'doviz'],
              ['TL', 'tl']
            ] as const
          ).map(([label, g]) => (
            <div key={g} className="rounded-xl bg-white/15 px-3 py-2 min-w-0">
              <span className="text-white/80 block">{label}</span>
              <span className="font-mono font-bold text-sm block truncate">{money(byGroup(g))}</span>
            </div>
          ))}
        </div>
        </div>
        <div className="px-2">
        <AssetHistoryChart history={assetHistory} money={money} />
        {error && <p className="mt-2 text-[11px] text-rose-600">{error} — son bilinen fiyatlar gösteriliyor.</p>}
        </div>
      </div>

      )}

      {rows.length === 0 ? (
        <p className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
          Elinizdeki altını (ör. 22 ayar 50 gr, 3 çeyrek), dövizi ve TL birikimini ekleyin; değeri Harem Altın alış fiyatıyla hesaplanır.
        </p>
      ) : (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map(({ a, price, value }) => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {ASSET_LABELS[a.kind].label} · {amountText(a)}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {a.member}
                  {a.kind !== 'TRY' && price !== null ? ` · birim ${money(price)}` : ''}
                  {a.note ? ` · ${a.note}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
                  {value === null ? '—' : money(value)}
                </span>
                <button type="button" title="Düzenle" onClick={() => setEditing(a)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Sil"
                  onClick={() => window.confirm(`${ASSET_LABELS[a.kind].label} silinsin mi?`) && deleteAsset(a.id)}
                  className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <AssetModal
          asset={editing === 'new' ? null : editing}
          members={familyMembers.map((m) => m.name)}
          prices={prices}
          onClose={() => setEditing(null)}
          onSave={(a) => {
            saveAsset(a);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
};

// Toplam birikim değerinin zaman içindeki değişimi (günlük kayıtlardan çizgi)
const AssetHistoryChart: React.FC<{ history: AssetSnapshot[]; money: (tl: number) => string }> = ({ history, money }) => {
  const points = history.slice(-180);
  if (points.length < 2) {
    return <p className="mt-3 text-[11px] text-neutral-500">Değer geçmişi her gün kaydedilir; grafik yarından itibaren görünür.</p>;
  }
  const last = points[points.length - 1];
  const target = new Date(last.id);
  target.setDate(target.getDate() - 30);
  const monthAgo = [...points].reverse().find((p) => p.id <= target.toISOString().slice(0, 10)) ?? points[0];
  const change = last.total - monthAgo.total;
  const pct = monthAgo.total > 0 ? (change / monthAgo.total) * 100 : 0;
  const min = Math.min(...points.map((p) => p.total));
  const max = Math.max(...points.map((p) => p.total));
  const span = max - min || 1;
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${((i / (points.length - 1)) * 100).toFixed(2)},${(38 - ((p.total - min) / span) * 34).toFixed(2)}`)
    .join(' ');
  const up = change >= 0;
  const fmtDate = (id: string) => id.split('-').reverse().slice(0, 2).join('.');
  return (
    <div className="mt-3 pt-3 border-t border-amber-200/70 dark:border-amber-900/60">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-neutral-500">
          {fmtDate(monthAgo.id)} → {fmtDate(last.id)}
        </span>
        <span className={`font-mono font-semibold ${up ? 'text-sky-700 dark:text-sky-400' : 'text-rose-600'}`}>
          {up ? '+' : '−'}
          {money(Math.abs(change))} ({up ? '+' : '−'}%{Math.abs(pct).toLocaleString('tr-TR', { maximumFractionDigits: 1 })})
        </span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-12 mt-1" role="img" aria-label="Birikim değeri geçmişi">
        <path d={path} fill="none" stroke={up ? '#0284c7' : '#e11d48'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

const AssetModal: React.FC<{
  asset: AssetHolding | null;
  members: string[];
  prices: PriceSnapshot | null;
  onClose: () => void;
  onSave: (a: Omit<AssetHolding, 'id' | 'updatedAt'> & { id?: string }) => void;
}> = ({ asset, members, prices, onClose, onSave }) => {
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? 'ayar22');
  const [amount, setAmount] = useState(asset ? String(asset.amount).replace('.', ',') : '');
  const [member, setMember] = useState(asset?.member ?? members[0] ?? 'Ortak');
  const [note, setNote] = useState(asset?.note ?? '');
  const value = Number(amount.replace(/\./g, '').replace(',', '.'));
  const price = unitPrice(kind, prices);
  const input = 'w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!(value > 0)) return alert('Geçerli bir miktar girin.');
          onSave({ id: asset?.id, kind, amount: value, member, note: note.trim() || undefined });
        }}
        className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-5 space-y-3 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{asset ? 'Birikimi düzenle' : 'Birikim ekle'}</h4>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <label className="block text-xs text-neutral-500">
          Tür
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value as AssetKind)}>
            <optgroup label="Gram altın">
              {(['ayar22', 'ayar14', 'ayar18', 'has', 'gumus'] as AssetKind[]).map((k) => (
                <option key={k} value={k}>{ASSET_LABELS[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="Sikke altın (adet)">
              {(['ceyrek', 'yarim', 'tam', 'ata', 'gremse', 'ata5'] as AssetKind[]).map((k) => (
                <option key={k} value={k}>{ASSET_LABELS[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="Döviz ve TL">
              {(['USD', 'EUR', 'GBP', 'TRY'] as AssetKind[]).map((k) => (
                <option key={k} value={k}>{ASSET_LABELS[k].label}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="block text-xs text-neutral-500">
          Miktar ({ASSET_LABELS[kind].unit})
          <input className={input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ör: 50" autoFocus />
        </label>
        {kind !== 'TRY' && (
          <p className="text-[11px] text-neutral-500">
            {price === null
              ? 'Fiyat henüz alınamadı.'
              : `Harem alış: ${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(price)} ₺ / ${ASSET_LABELS[kind].unit}` +
                (value > 0 ? ` → ${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(price * value)} ₺` : '')}
            {kind === 'ayar18' ? ' (Harem 18 ayar yayınlamıyor; has fiyatının %75\'i alınır)' : ''}
          </p>
        )}
        <label className="block text-xs text-neutral-500">
          Kimin
          <select className={input} value={member} onChange={(e) => setMember(e.target.value)}>
            {Array.from(new Set([...members, 'Ortak'])).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-neutral-500">
          Not (isteğe bağlı)
          <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör: bilezik, kasada" />
        </label>
        <button type="submit" className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
          Kaydet
        </button>
      </form>
    </div>
  );
};

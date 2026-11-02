// Birikim değerleme: Harem Altın alış fiyatları (sunucu işlevi "cebim" üzerinden, 5 dk önbellekli)
import type { AssetKind } from '../types/budget';
import { SUPABASE_URL } from './cloudStore';

export interface PriceSnapshot {
  source: string;
  basis: string;
  updatedAt: string;
  haremTime: string | null;
  items: Partial<Record<AssetKind, number | null>>;
}

export const ASSET_LABELS: Record<AssetKind, { label: string; unit: string; group: 'altin' | 'doviz' | 'tl' }> = {
  has: { label: 'Has altın (24 ayar)', unit: 'gr', group: 'altin' },
  ayar22: { label: '22 ayar altın', unit: 'gr', group: 'altin' },
  ayar18: { label: '18 ayar altın', unit: 'gr', group: 'altin' },
  ayar14: { label: '14 ayar altın', unit: 'gr', group: 'altin' },
  ceyrek: { label: 'Çeyrek altın', unit: 'adet', group: 'altin' },
  yarim: { label: 'Yarım altın', unit: 'adet', group: 'altin' },
  tam: { label: 'Tam altın', unit: 'adet', group: 'altin' },
  ata: { label: 'Ata altın', unit: 'adet', group: 'altin' },
  gremse: { label: 'Gremse altın', unit: 'adet', group: 'altin' },
  ata5: { label: 'Beşli ata', unit: 'adet', group: 'altin' },
  gumus: { label: 'Gümüş', unit: 'gr', group: 'altin' },
  USD: { label: 'Dolar', unit: '$', group: 'doviz' },
  EUR: { label: 'Euro', unit: '€', group: 'doviz' },
  GBP: { label: 'Sterlin', unit: '£', group: 'doviz' },
  TRY: { label: 'Türk lirası', unit: '₺', group: 'tl' }
};

const CACHE_KEY = 'cebim_harem_prices_v1';
const MAX_AGE_MS = 5 * 60 * 1000;

export function cachedPrices(): PriceSnapshot | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

export async function fetchPrices(force = false): Promise<PriceSnapshot> {
  const cached = cachedPrices();
  if (!force && cached && Date.now() - new Date(cached.updatedAt).getTime() < MAX_AGE_MS) return cached;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cebim?action=prices`);
  if (!res.ok) throw new Error('Harem fiyatları alınamadı');
  const data: PriceSnapshot = await res.json();
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // önbelleğe yazılamazsa sorun değil
  }
  return data;
}

// Birim fiyat (TL); TL için 1
export function unitPrice(kind: AssetKind, prices: PriceSnapshot | null): number | null {
  if (kind === 'TRY') return 1;
  return prices?.items?.[kind] ?? null;
}

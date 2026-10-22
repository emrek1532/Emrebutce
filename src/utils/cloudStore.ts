// Şifreli kasa depolama katmanı.
// VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlıysa Supabase RPC'leri kullanılır
// (Cloudflare gibi statik barındırma için); yoksa yerel Express sunucusundaki /api/sync kullanılır.

export interface EncryptedVaultRecord {
  ciphertext: string;
  iv: string;
  salt: string;
  version?: number;
  updatedAt?: string;
  clientInfo?: string;
}

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

export class VaultNotFoundError extends Error {}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Yalnızca Realtime (anlık "kasa güncellendi" sinyali) için kullanılır; veri RPC ile taşınır.
const realtimeClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const NOT_CONFIGURED_MESSAGE =
  'Bulut sunucusu yapılandırılmamış (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY eksik).';

async function callRpc(fn: string, args: Record<string, unknown>): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(args)
  });
}

// Sunucunun kaydettiği zaman damgasını döndürür (cihazlar arası "hangisi daha yeni" karşılaştırması için).
export async function saveVault(vaultId: string, record: EncryptedVaultRecord): Promise<string | undefined> {
  const response = isSupabaseConfigured
    ? await callRpc('upsert_vault', {
        p_vault_id: vaultId,
        p_ciphertext: record.ciphertext,
        p_iv: record.iv,
        p_salt: record.salt,
        p_version: record.version ?? 1,
        p_client_info: record.clientInfo ?? null
      })
    : await fetch(`/api/sync/${encodeURIComponent(vaultId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

  if (!response.ok) {
    throw new Error(`Bulut sunucu yanıtı başarısız (${response.status})`);
  }
  // Statik barındırmada (/api/sync yokken) SPA index.html'i 200 ile döner; bunu başarı sayma.
  if (!response.headers.get('content-type')?.includes('json')) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }
  const data = await response.json();
  return typeof data === 'string' ? data : data?.updatedAt;
}

export async function loadVault(vaultId: string): Promise<EncryptedVaultRecord> {
  if (isSupabaseConfigured) {
    const response = await callRpc('get_vault', { p_vault_id: vaultId });
    if (!response.ok) {
      throw new Error(`Bulut bağlantı hatası: ${response.status}`);
    }
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new VaultNotFoundError('Bu Kasa Kodu ile kayıtlı bulut yedeği bulunamadı.');
    }
    const row = rows[0];
    return {
      ciphertext: row.ciphertext,
      iv: row.iv,
      salt: row.salt,
      version: row.version,
      updatedAt: row.updated_at,
      clientInfo: row.client_info
    };
  }

  const response = await fetch(`/api/sync/${encodeURIComponent(vaultId)}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new VaultNotFoundError('Bu Kasa Kodu ile kayıtlı bulut yedeği bulunamadı.');
    }
    throw new Error(`Bulut bağlantı hatası: ${response.status}`);
  }
  if (!response.headers.get('content-type')?.includes('json')) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }
  return response.json();
}

// Kanal adı kasa kimliğinden türetilir; kasa kimliği ağda düz metin olarak görünmez.
async function vaultChannelName(vaultId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ailve-vault:${vaultId}`));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `ailve-${hex.slice(0, 32)}`;
}

export interface VaultLiveLink {
  notifyUpdated: (updatedAt?: string) => void;
  close: () => void;
}

// Aynı kasayı kullanan diğer cihazlardan gelen "güncellendi" sinyallerini dinler.
// onUpdate, sinyal geldiğinde ve bağlantı (yeniden) kurulduğunda çağrılır (kaçırılan güncellemeler için).
export function connectVaultLive(vaultId: string, onUpdate: () => void): VaultLiveLink {
  if (!realtimeClient) {
    return { notifyUpdated: () => {}, close: () => {} };
  }
  const client = realtimeClient;
  let channel: RealtimeChannel | null = null;
  let closed = false;

  vaultChannelName(vaultId).then((name) => {
    if (closed) return;
    channel = client.channel(name, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'vault-updated' }, () => onUpdate())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onUpdate();
      });
  });

  return {
    notifyUpdated: (updatedAt) => {
      channel
        ?.send({ type: 'broadcast', event: 'vault-updated', payload: { updatedAt } })
        .catch((err) => console.warn('Anlık eşitleme sinyali gönderilemedi:', err));
    },
    close: () => {
      closed = true;
      if (channel) client.removeChannel(channel);
    }
  };
}

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

export class VaultNotFoundError extends Error {}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

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

export async function saveVault(vaultId: string, record: EncryptedVaultRecord): Promise<void> {
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
  return response.json();
}

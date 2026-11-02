// Aile paylaşım linki: herkes aynı linki açınca aynı verileri görür.
// Gizli kısım adresin "#" sonrasında durur; bu kısım sunucuya hiç gönderilmez, yalnızca cihazda okunur.

export interface ShareCredentials {
  vaultId: string;
  passphrase: string;
}

export function buildShareLink(origin: string, creds: ShareCredentials): string {
  return `${origin}/#aile=${encodeURIComponent(creds.vaultId)}.${encodeURIComponent(creds.passphrase)}`;
}

// Tam link, "#aile=..." parçası ya da eski "?vault=...&key=..." biçimini çözer
export function parseShareLink(input: string): ShareCredentials | null {
  const text = input.trim();
  if (!text) return null;

  const hashMatch = text.match(/aile=([^.&\s]+)\.([^&\s]+)/);
  if (hashMatch) {
    const vaultId = decodeURIComponent(hashMatch[1]).trim().toUpperCase();
    const passphrase = decodeURIComponent(hashMatch[2]).trim();
    if (vaultId && passphrase) return { vaultId, passphrase };
  }

  const queryStart = text.indexOf('?');
  if (queryStart >= 0) {
    const params = new URLSearchParams(text.slice(queryStart + 1).split('#')[0]);
    const vaultId = params.get('vault')?.trim().toUpperCase();
    const passphrase = params.get('key')?.trim();
    if (vaultId && passphrase) return { vaultId, passphrase };
  }
  return null;
}

// Uygulama bir paylaşım linkiyle açıldıysa bilgileri döndürür
export function readShareLinkFromLocation(): ShareCredentials | null {
  if (typeof window === 'undefined') return null;
  return parseShareLink(window.location.hash) || parseShareLink(window.location.search);
}

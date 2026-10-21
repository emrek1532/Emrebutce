/**
 * Web Crypto API based End-to-End Encryption (E2EE)
 * AES-GCM 256-bit with PBKDF2 Key Derivation (100,000 iterations SHA-256)
 */

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateVaultId(): string {
  const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8)
    .toUpperCase();
  return `AILE-${randomChars}`;
}

export function generateMasterPassphrase(): string {
  const adjectives = ['guvenli', 'huzurlu', 'akilli', 'bereketli', 'saglam', 'modern'];
  const nouns = ['aile', 'butce', 'tasarruf', 'yuva', 'kasa', 'gelecek'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(
  plainObject: any,
  passphrase: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const enc = new TextEncoder();
  const plainText = JSON.stringify(plainObject);
  const plainBytes = enc.encode(plainText);

  // 16-byte random salt for PBKDF2
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // 12-byte random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveAesKey(passphrase, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    plainBytes
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt)
  };
}

export async function decryptData(
  encrypted: { ciphertext: string; iv: string; salt: string },
  passphrase: string
): Promise<any> {
  const salt = base64ToBuffer(encrypted.salt);
  const iv = base64ToBuffer(encrypted.iv);
  const ciphertextBytes = base64ToBuffer(encrypted.ciphertext);

  const key = await deriveAesKey(passphrase, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any
      },
      key,
      ciphertextBytes as any
    );

    const dec = new TextDecoder();
    const plainText = dec.decode(decryptedBuffer);
    return JSON.parse(plainText);
  } catch (err) {
    throw new Error('Şifre çözme başarısız: Anahtar kelime veya parola hatalı olabilir.');
  }
}

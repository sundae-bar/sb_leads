import crypto from 'node:crypto';

// AES-256-GCM symmetric encryption for the raw value of *managed* API keys.
// The encryption key is derived from a deployment-wide secret so that the
// chat agent can recover its own MCP api-key on every request without
// asking the user to supply one.
//
// MANAGED_KEY_SECRET should be a long random string in env. We HKDF-derive a
// 32-byte AES key from it so the env secret can be any length / form.

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM nonce
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.MANAGED_KEY_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'MANAGED_KEY_SECRET is missing or too short. Set a random 32+ char value in .env.',
    );
  }
  // HKDF with a fixed salt + info — produces a stable 32-byte key from any secret.
  cachedKey = crypto.hkdfSync(
    'sha256',
    Buffer.from(secret, 'utf8'),
    Buffer.from('sundae-managed-key-salt'),
    Buffer.from('sundae-managed-key-v1'),
    32,
  ) as Buffer;
  return cachedKey;
}

/** Encrypt a raw secret for storage. Output layout: iv ‖ authTag ‖ ciphertext. */
export function encryptForStorage(plaintext: string): Buffer {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

/** Decrypt a stored secret. */
export function decryptFromStorage(blob: Buffer): string {
  if (blob.length < IV_LEN + TAG_LEN) {
    throw new Error('encrypted blob is too short');
  }
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

// Returns a usable raw API key the *chat agent* can use to authenticate against
// its own MCP server. The key is persisted into the regular api_keys table,
// flagged is_managed=true, with an encrypted copy of the raw value so we can
// recover it on subsequent requests. The user sees this key in the API keys
// settings page like any other (but tagged "managed").
//
// This is what enables the dogfooding flow: the chat agent calls /mcp the same
// way an external customer would — with an Authorization: Bearer header — and
// the MCP server enforces the same auth path (requireLeadsAuth).
import crypto from 'node:crypto';
import { adminDb } from '../db/admin.js';
import { encrypt } from './encryption.js';
import { encryptForStorage, decryptFromStorage } from './managed-key-crypto.js';

const pepper = process.env.API_KEY_PEPPER ?? '';

function hashForLookup(raw: string): string {
  return crypto.createHash('sha256').update(raw + pepper).digest('hex');
}

function generateRaw(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk-';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function preview(raw: string): string {
  return `sk-...${raw.slice(-4)}`;
}

interface EnsureParams {
  tenantId: string;
  /** Owner user id. Required because api_keys.user_id is non-null. */
  userId: string;
  /** Name acts as the purpose tag — unique per (tenant, is_managed). */
  name: string;
}

/**
 * Look up the managed key for this purpose; mint one if missing.
 * Returns the raw key value the chat agent should send as `Bearer <key>`.
 */
export async function ensureManagedApiKey(params: EnsureParams): Promise<string> {
  const { data: existing } = await adminDb
    .from('api_keys')
    .select('id, value_encrypted, expires_at')
    .eq('tenant_id', params.tenantId)
    .eq('name', params.name)
    .eq('is_managed', true)
    .maybeSingle();

  if (existing) {
    const blob = existing.value_encrypted as Buffer | string | null;
    if (blob) {
      // Supabase returns bytea as base64 string when serialised over PostgREST.
      const buf =
        typeof blob === 'string'
          ? Buffer.from(blob.startsWith('\\x') ? blob.slice(2) : blob, blob.startsWith('\\x') ? 'hex' : 'base64')
          : Buffer.from(blob as ArrayBuffer);
      try {
        return decryptFromStorage(buf);
      } catch {
        // Encryption secret rotated or blob corrupted — fall through to mint a
        // fresh one. We delete the stale row so the unique index allows insert.
        await adminDb.from('api_keys').delete().eq('id', existing.id as string);
      }
    } else {
      // Row exists without an encrypted value — replace it.
      await adminDb.from('api_keys').delete().eq('id', existing.id as string);
    }
  }

  const raw = generateRaw();
  const encryptedRaw = encryptForStorage(raw);

  const { error } = await adminDb.from('api_keys').insert({
    user_id: params.userId,
    tenant_id: params.tenantId,
    name: params.name,
    key_hash: encrypt(raw),
    key_preview: preview(raw),
    key_lookup_hash: hashForLookup(raw),
    is_managed: true,
    value_encrypted: encryptedRaw,
  });

  if (error) {
    throw new Error(`Failed to mint managed key: ${error.message}`);
  }

  return raw;
}

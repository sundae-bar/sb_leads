import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiKey } from '@sundae/types';
import { encrypt } from '../../lib/encryption.js';
import { adminDb } from '../admin.js';

const pepper = process.env.API_KEY_PEPPER ?? '';

function hashApiKeyForLookup(key: string): string {
  return crypto.createHash('sha256').update(key + pepper).digest('hex');
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk-';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function getKeyPreview(key: string): string {
  return `sk-...${key.slice(-4)}`;
}

export async function listApiKeys(supabase: SupabaseClient): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toApiKey);
}

export async function getApiKey(supabase: SupabaseClient, id: string): Promise<ApiKey | null> {
  const { data, error } = await supabase.from('api_keys').select('*').eq('id', id).single();
  if (error) return null;
  return toApiKey(data);
}

export async function createApiKey(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  name: string,
  expiresAt: Date | null,
): Promise<{ apiKey: ApiKey; fullKey: string }> {
  const fullKey = generateApiKey();
  const keyHash = encrypt(fullKey);
  const keyPreview = getKeyPreview(fullKey);
  const keyLookupHash = hashApiKeyForLookup(fullKey);

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      name,
      key_hash: keyHash,
      key_preview: keyPreview,
      key_lookup_hash: keyLookupHash,
      expires_at: expiresAt?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return { apiKey: toApiKey(data), fullKey };
}

export async function deleteApiKey(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from('api_keys').delete().eq('id', id);
  return !error;
}

export async function updateLastUsed(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export interface ApiKeyLookupRow {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: string | null;
}

export async function lookupApiKeyByHash(
  rawKey: string,
): Promise<ApiKeyLookupRow | null> {
  const hash = hashApiKeyForLookup(rawKey);
  const { data, error } = await adminDb
    .from('api_keys')
    .select('id, user_id, tenant_id, expires_at')
    .eq('key_lookup_hash', hash)
    .single();

  if (error || !data) return null;
  return {
    id: data.id as string,
    userId: data.user_id as string,
    tenantId: data.tenant_id as string,
    expiresAt: (data.expires_at as string | null) ?? null,
  };
}

function toApiKey(row: Record<string, unknown>): ApiKey {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    keyHash: row.key_hash as string,
    keyPreview: row.key_preview as string,
    expiresAt: (row.expires_at as string | null) ?? null,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isManaged: (row.is_managed as boolean | null) ?? false,
  };
}

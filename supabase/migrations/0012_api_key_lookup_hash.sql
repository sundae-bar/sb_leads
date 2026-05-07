-- Add deterministic lookup hash column to api_keys.
-- The hash is sha256(raw_key || pepper) computed in application code.
-- This allows O(1) key verification without decrypting the stored key_hash.

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_lookup_hash TEXT;

CREATE INDEX IF NOT EXISTS api_keys_lookup_hash_idx ON api_keys (key_lookup_hash);

-- Managed API keys.
--
-- Most api_keys rows are created by users via /api/v1/api-keys POST and the
-- raw value is shown ONCE — never persisted. The hashed copy is enough to
-- verify incoming requests.
--
-- A small subset of keys are *managed* by the platform itself: e.g. the
-- internal key the chat agent uses to call its own MCP server (so the agent
-- talks to the MCP server the same way an external integrator would, via
-- HTTP + Bearer token). For these we need to recover the raw value
-- whenever the agent runs, so we store an encrypted copy alongside the hash.
--
-- `value_encrypted` holds the AES-256-GCM ciphertext (iv ‖ authTag ‖ ct)
-- of the raw key, keyed by a deployment-wide secret (MANAGED_KEY_SECRET).
-- Only set when `is_managed = true`.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS is_managed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS value_encrypted BYTEA;

-- A tenant has at most one managed key with a given purpose-name (e.g. 'chat').
-- We piggy-back on the `name` column for the purpose tag.
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_managed_per_tenant
  ON api_keys (tenant_id, name)
  WHERE is_managed;

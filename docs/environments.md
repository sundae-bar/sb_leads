# Environments

Three environments, one source of truth for schema (`supabase/migrations/`).

| Environment | Database | App runs |
|---|---|---|
| **Local** | `supabase start` (Docker stack) | `pnpm dev` (web :3004, api :4000) |
| **Staging** | Supabase **persistent branch** `staging` | deployed staging app (Vercel/Railway) |
| **Production** | Supabase **production branch** (= git `main`) | deployed prod app |

We use **Supabase Branching** (Pro feature), not separate projects:

- **Production branch** ↔ git `main` — the live instance.
- **`staging`** — a *persistent* branch (doesn't auto-delete) that backs the staging app.
- **Preview branches** — created automatically per PR, ephemeral, isolated. Supabase runs every migration in `supabase/migrations/` plus `supabase/seed.sql` on each, then tears it down on merge/close. Use them to review risky migrations before they reach staging.

> **Branching covers the database + auth only.** Each environment's *app* still needs its own deploy with its own env vars (below). Branching does not deploy the Next/Express apps.

## Migration flow (never hand-edit schema)

`supabase/migrations/` is canonical. Schema changes only ever happen by adding a migration:

1. Write the migration locally, apply with `supabase db reset` (re-runs all migrations + `seed.sql`).
2. Open a PR → Supabase spins up a preview branch and applies the migration there. CI also runs the suite against a throwaway `supabase start` stack.
3. Merge the PR into `staging` → the Supabase `staging` branch applies the migrations; validate there.
4. Promote `staging` → `main` (see [Merge & promotion strategy](#merge--promotion-strategy)) → the production branch applies them.

`seed.sql` runs on **local + every Supabase branch**, but **not** on production (`db push` applies migrations only). Keep it synthetic — see [supabase/seed.sql](../supabase/seed.sql) (currently a QA credit coupon, `STAGINGCREDITS`).

## Merge & promotion strategy

Changes flow one direction only: **feature branch → `staging` → `main`**. Keeping the flow
one-directional is what stops `staging` and `main` from diverging, so promotions never hit
merge conflicts.

- **Feature → `staging`:** squash-merge (tidy) or merge commit — your call.
- **`staging` → `main` (promotion):** **always a merge commit — never _squash_, never _rebase_.**
  Squashing the promotion creates a `main`-only commit and diverges the two branches; that's the
  usual source of phantom conflicts on the next promotion.
- **Never commit directly to `main`.** Every change enters through `staging` first.
- **Hotfixes:** route through `staging` when you can. If you must commit straight to `main`,
  immediately `git merge main` into `staging` to re-sync.

Invariant to hold: **`main` is always fast-forwardable to `staging`.** While that holds, there is
nothing to conflict.

Repo settings already allow merge commits. `delete_branch_on_merge` is intentionally **off** — with
it on, merging a `staging → main` PR would try to delete the long-lived `staging` branch.

Recommended next step (not yet enabled): branch-protect `main` and `staging` — require a PR, block
direct pushes / force-push / deletion. If you require a status check, require **quality** (runs on
every PR), not **integration** (skipped on docs-only PRs — a skipped _required_ check blocks merges).

## Per-environment variables (what differs)

Most vars are the same shape as [`.env.example`](../.env.example); these are the ones that **must differ** by environment. Get the staging Supabase values from the dashboard: **Branches → `staging` → Project Settings → API**.

| Variable(s) | Local | Staging | Production |
|---|---|---|---|
| `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54331` | staging branch API URL | prod API URL |
| `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `supabase status` | staging branch keys | prod keys |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | from `supabase status` | staging branch | prod (**never reuse across envs**) |
| `WEB_URL`, `NEXT_PUBLIC_API_URL`, `API_URL` | localhost | staging domains | prod domains |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **test** mode | **test** mode | **live** mode (separate webhook endpoint) |
| `X402_NETWORK`, `X402_FACILITATOR_URL` | Base Sepolia + `x402.org` | Base Sepolia + `x402.org` | Base mainnet + CDP facilitator |
| `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` | blank | blank | **set** (mainnet facilitator auth) |
| `X402_DISCOVERABLE` | `false` | `false` | `true` (list on Bazaar/agentic.market) |
| `THE402_API_KEY`, `THE402_WEBHOOK_SECRET` | blank | sandbox | live |
| `API_KEY_ENCRYPTION_KEY`, `API_KEY_PEPPER`, `MANAGED_KEY_SECRET` | any local values | **distinct** staging secrets | **distinct** prod secrets |

Key rule for a payments product: **staging is test-mode/testnet everywhere** (Stripe test, x402 Base Sepolia, no CDP keys). [x402/server.ts](../apps/api/src/integrations/x402/server.ts) auto-selects the no-auth `x402.org` facilitator when `CDP_API_KEY_ID` is unset, so leaving CDP blank is what keeps staging on testnet.

## One-time staging setup

1. **Supabase dashboard:** enable Branching, connect the `sundae-bar/sb_leads` GitHub repo, set the production branch to `main`, then create a persistent branch named `staging`.
2. **OAuth secrets:** `config.toml` wires social auth via env (`GITHUB_CLIENT_ID`, `GOOGLE_CLIENT_ID`, …). Set these as branch secrets or social login won't work on staging/previews.
3. **Deploy the staging app** (web + api) with the staging env values from the table above.
4. **Seed test data:** the `STAGINGCREDITS` coupon is seeded automatically. Create a test user against the staging branch with `pnpm create-user` (point its env at staging), then redeem the coupon via the billing page to fund credits without Stripe.

## Local quick reference

```bash
supabase start                 # boot the Docker stack
cp .env.example .env            # fill SUPABASE_* from `supabase status -o env`
pnpm dev                        # web :3004, api :4000
supabase db reset               # re-apply all migrations + seed.sql
supabase stop                   # shut the stack down (data persists in a volume)
```

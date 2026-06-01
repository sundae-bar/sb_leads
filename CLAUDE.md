# Scoop (sb_leads) — orientation for Claude

Scoop is the email-lead-generation product in the **sundae_bar** agent portfolio. Brand: `scoop` (lowercase, with sup `s_`) — never "Scoop" as a wordmark.

A pnpm monorepo: Next.js web + Express API + Supabase + Vercel AI SDK. Multi-tenant with **RLS actively enforced via JWT app_metadata** — see [§ Tenancy](#tenancy). Same `findEmails()` service is exposed through **five** front doors (dashboard, chat, MCP, the402 marketplace, raw x402 endpoint) — see [§ Marketplace integrations](#marketplace-integrations).

## Source-of-truth docs

| File | Purpose |
|---|---|
| [README.md](README.md) | Engineering / marketplace docs index — points into `docs/`. **Holds no setup steps** (those are in the Dev workflow section below). |
| [docs/environments.md](docs/environments.md) | Local / staging / production topology (Supabase branching), migration flow, per-environment secrets. |
| [docs/the402.md](docs/the402.md) | the402.ai managed-marketplace path (webhook + USDC payouts, 5% fee). |
| [docs/x402.md](docs/x402.md) | Raw x402 protocol endpoint at `/x402/find-email` (direct USDC on Base, listed on Coinbase Bazaar → agentic.market). |
| [docs/extending.md](docs/extending.md) | Playbook for new input params, new providers, new services. |

## Workspace

| Path | What | Stack |
|---|---|---|
| `apps/web` | Next.js frontend, dev port **3004**, prod 3000 | Next 16, React 19, shadcn/ui, Tailwind 4, TanStack Query 5 |
| `apps/api` | Express backend, port **4000** | Express 5 (ESM), Vercel AI SDK, Trigger.dev v3, Pino, Zod |
| `packages/types` | `@scoop/types` — `api.ts`, `db.ts`, `agent.ts`, `auth.ts`, barrel `index.ts` | DB rows mapped snake_case → camelCase before crossing the boundary |
| `supabase/migrations` | 16 migrations (0001-0016) | RLS active, JWT-claim-based |
| `scripts/` | `create-user.ts`, `create-admin.ts`, `backfill-active-tenant.ts` | `pnpm <name>` from root |

## Two API surfaces (important)

This repo has **two backends** that look similar but serve different purposes. Don't assume a request goes where you'd expect.

1. **Next.js Route Handlers** — `apps/web/src/app/api/**/route.ts`
   - Mounted at relative `/api/...` paths (no `v1` prefix).
   - Hit by hooks via a local `apiFetch` (see [useConversations.ts](apps/web/src/hooks/useConversations.ts)) — same-origin fetch, auth via Supabase cookie session.
   - Use `await createClient()` from [`@/lib/supabase/server`](apps/web/src/lib/supabase/server.ts) — anon-key client tied to the user's cookie. **RLS is active**, scoping every query to the JWT's `active_tenant_id` claim.
   - Use [`createAdminClient()`](apps/web/src/lib/supabase/admin.ts) only for genuine admin work (super-admin lists, `auth.admin.*` calls, tenant provisioning). Gate with `user.isSuperAdmin` or `user.tenantRole !== 'member'`.
   - Routes that exist purely to forward to Express (traces, api-keys) just proxy with the Bearer token; no admin client needed.

2. **Express API** — `apps/api/src/routes/*.ts`
   - Mounted at `/api/v1/...` (chat, conversations, traces, api-keys).
   - Hit by [`apiClient`](apps/web/src/lib/api-client.ts) with `Authorization: Bearer <supabase access_token>`. Primarily used for **streaming chat**.
   - [requireAuth](apps/api/src/middleware/auth.ts) verifies the JWT, reads `app_metadata.active_tenant_id`, validates against `tenant_members`, then attaches `req.user` and `req.supabase` (a per-request anon-key client carrying the user's JWT).
   - Routes pass `req.supabase` into queries. RLS does the rest.

When adding an endpoint, decide which surface it belongs on. CRUD-style work in the user's session → Next Route Handler. Streaming, server-to-server, or jobs → Express.

## Auth + tenant flow

- Web auth gate is [apps/web/src/proxy.ts](apps/web/src/proxy.ts) (yes, named `proxy.ts`, not `middleware.ts` — it's still the Next middleware: see its `export const config = { matcher }`).
- Active tenant lives in `auth.users.app_metadata.active_tenant_id`, signed into every JWT.
- Onboarding flow ([apps/web/src/app/(auth)/onboarding/page.tsx](apps/web/src/app/(auth)/onboarding/page.tsx)) creates a tenant + membership, then writes `app_metadata` and calls `supabase.auth.refreshSession()` so the new claim lands in the JWT cookie.
- Super-admin tenant switching ([api/admin/switch-tenant/route.ts](apps/web/src/app/api/admin/switch-tenant/route.ts)) updates `app_metadata` via `auth.admin.updateUserById`, then the client calls `refreshSession()` (see [tenant-switcher.tsx](apps/web/src/components/tenant-switcher.tsx)).
- proxy.ts handles legacy users (membership exists but `app_metadata` empty) by backfilling and bouncing through `/login`.

## DB conventions

- Direct Supabase client calls — no ORM, no query builder.
- API queries take a `SupabaseClient` argument (the per-request user-scoped client). Construction lives in [apps/api/src/db/factory.ts](apps/api/src/db/factory.ts) (`createUserClient(token)`) and [apps/api/src/db/admin.ts](apps/api/src/db/admin.ts) (`adminDb`).
- Each query module exports a `toType()` mapper converting snake_case rows → camelCase types.
- Reads omit `.eq('tenant_id', X)` — RLS handles tenancy. Writes still set `user_id` / `tenant_id` on the row, and the policy's `WITH CHECK` validates them.

## Tenancy

RLS is active and JWT-driven. **Don't ship a query that bypasses it without a clear reason.**

- `auth.users.app_metadata.active_tenant_id` is the source of truth for the active tenant. It's signed into every JWT.
- [`get_active_tenant_id()`](supabase/migrations/0010_jwt_tenancy.sql) reads the JWT claim **and** verifies it against `tenant_members` — defence in depth. A spoofed claim returns null and reads return zero rows.
- Tables with `tenant_id`: `conversations`, `agent_runs`, `api_keys`, `subscriptions`. Each has a policy `using (tenant_id = get_active_tenant_id())`.
- `messages` and `agent_run_steps` are scoped via their parent (conversations and agent_runs respectively).
- Use the user-scoped client (`req.supabase` in Express, `await createClient()` in Next) for everything user-facing. Reserve `adminDb` / `createAdminClient()` for: tenant provisioning, super-admin lists, `auth.admin.*` calls, Trigger.dev cron.
- Cron has no user — use `adminDb` and pass `tenant_id` explicitly. Set `SYSTEM_TENANT_ID` env if a cron task should record traces.

When a new query is needed: prefer the user-scoped client. The first review question is "does this go through RLS, or do we genuinely need adminDb?"

## Agents + trace logger

[trace-logger.ts](apps/api/src/lib/trace-logger.ts) is a factory: `makeTraceLogger(supabase)`. Wraps any agent in:

```
startRun()                → creates agent_runs row, returns run id
logStep()                 → called from Vercel AI SDK's onStepFinish, writes agent_run_steps row
completeRun() / failRun() → updates run status + tokens + duration
```

New agent: copy [chat-agent.ts](apps/api/src/agents/chat-agent.ts), receive `supabase` from the route, hand it to `makeTraceLogger`. Pass `conversationId`, `userId`, `tenantId` through.

Cron path: import `adminDb`, build the trace logger from it, set `tenant_id` on every insert.

## Billing

Stripe-direct, per-tenant, with credit-based auto-rebill. Plans + features + the credit meter live in [packages/types/src/billing.ts](packages/types/src/billing.ts) — single config file, edited by humans.

- **One subscription per tenant**, seeded as `free` at tenant-creation time. The [subscriptions table](supabase/migrations/0011_billing.sql) holds `plan_id`, `credits_remaining`, Stripe IDs, status. RLS-scoped.
- **Credit consumption** is gated by [`consume_credits(tenant_id, amount)` SQL function](supabase/migrations/0011_billing.sql) — atomic, race-safe via `WHERE credits_remaining >= amount`. Wrapped in [`apps/api/src/lib/billing.ts`](apps/api/src/lib/billing.ts) (Express) and [`apps/web/src/lib/billing/index.ts`](apps/web/src/lib/billing/index.ts) (Next).
- **Auto-rebill** on credit exhaustion calls `stripe.subscriptions.update({ billing_cycle_anchor: 'now', proration_behavior: 'none' })` — Stripe issues an immediate invoice; the webhook replenishes credits and resets the cycle. Throttled by `minRebillIntervalSeconds` per plan (default 600).
- **Webhook** at [`/api/billing/webhook`](apps/web/src/app/api/billing/webhook/route.ts) handles `checkout.session.completed`, `invoice.payment_succeeded/failed`, `customer.subscription.updated/deleted`. Idempotent via `processed_stripe_events` table. Always uses `adminDb` (no user context).
- **Routes**: `/api/billing/checkout` (start subscription), `/api/billing/portal` (Customer Portal), `/api/billing/subscription` (current state). Owner/admin-only on the first two.
- **Pluggable meter**: `meterAgentRun(run): number` in `billing.ts`. Default 1 credit per LLM call. Switch to token- or cost-based and move the `consumeCredits` call to post-run in [chat.ts](apps/api/src/routes/chat.ts).
- **Adding a plan**: create the price in Stripe Dashboard → add to `PLANS` in [billing.ts](packages/types/src/billing.ts) → set `STRIPE_PRICE_<NAME>` env var. No DB migration.
- **Feature gating**: `useHasFeature(feature)` (web), `hasFeature(supabase, feature)` (server).

## Marketplace integrations

Scoop runs on **five front doors** that all converge on `findEmails()` ([apps/api/src/services/findEmail.ts](apps/api/src/services/findEmail.ts)). When debugging a "where does this request go?" question, this table is the starting point:

| Surface | Path | Audience | Auth | Billing |
|---|---|---|---|---|
| Dashboard | `/app` (Next.js) | Logged-in human in a tenant | Supabase JWT cookie | Internal credits (Stripe) |
| Chat | `/app/chat` → Express `/api/v1/chat/stream` | Logged-in human | Supabase JWT | Internal credits (per-tool, via MCP) |
| MCP | `POST /mcp` | External AI agent | API key (`Authorization: Bearer`) or JWT | Internal credits |
| **the402 marketplace** | `POST /the402/webhook` | the402.ai buyers | HMAC signature from the402 | USDC on Base via the402 (5% fee) |
| **x402 direct** | `POST /x402/find-email` | Any x402 client | Signed EIP-3009 payment proof | USDC on Base directly to our wallet |

Both marketplace surfaces use the same `findEmails()` engine and the same deliverable JSON shape ([the402 services.ts](apps/api/src/integrations/the402/services.ts) declares both `input_schema` and `deliverable_schema`; the x402 endpoint mirrors them). Refund-on-empty works on the402 ([webhook.ts](apps/api/src/integrations/the402/webhook.ts)) and the internal paths but **not on x402** (`exact` scheme limitation — documented in [docs/x402.md](docs/x402.md)).

- **For day-to-day questions** about either marketplace: read [docs/the402.md](docs/the402.md) and [docs/x402.md](docs/x402.md). They're 2-3 pages each and cover env vars, request/response shape, common operational moves.
- **Adding a new input parameter** (e.g. let buyers pass `name + company` instead of just `linkedin_url`): see [docs/extending.md](docs/extending.md) §1.
- **Adding a new sourcing provider** alongside Aleads/Apollo/Nymeria/ContactOut/Hunter: [docs/extending.md](docs/extending.md) §2.
- **Adding a sibling service** (e.g. `verify_email`, `enrich_person`) — listed on both marketplaces: [docs/extending.md](docs/extending.md) §3.

Operational scripts live in [apps/api/scripts/](apps/api/scripts/):
- `pnpm the402:sync` — sync `LISTED_SERVICES` to the402's catalog after a manifest change.
- `pnpm x402:self-test` — end-to-end protocol test (faucet → buyer wallet → payment → deliverable).
- `pnpm cdp:create-eoa` — one-shot to mint the receiving CDP wallet (already done; ID is in `X402_PAY_TO_ADDRESS`).
- `pnpm discovery:poll` — watch for Scoop appearing in Coinbase Bazaar + agentic.market.

## Dev workflow (compact)

```bash
pnpm install
supabase start && supabase migration up
cp .env.example .env   # fill from `supabase status --output json`
pnpm dev               # web :3004, api :4000, studio :54333
```

If migrating an existing local DB to RLS-active: `pnpm backfill-active-tenant` writes `app_metadata.active_tenant_id` for every existing `tenant_members` user.

Useful: `pnpm typecheck`, `pnpm lint`, `pnpm test` (cross-tenant isolation suite in [apps/api/__tests__/tenancy.test.ts](apps/api/__tests__/tenancy.test.ts)), `supabase db reset`.

## Gotchas

- **API is ESM** (`"type": "module"`). Relative imports must end in `.js` even from `.ts` files (e.g. `import { x } from './foo.js'`).
- **API loads `.env` from repo root** via `tsx --env-file=../../.env`. Editing `apps/api/.env` won't do anything.
- **Web dev port is 3004**, set in `apps/web/package.json`. The Express CORS origin defaults to `WEB_URL ?? 'http://localhost:3000'` — set `WEB_URL=http://localhost:3004` in `.env` for dev or CORS will reject preflight.
- **`apps/web/src/proxy.ts` is the Next middleware** despite the name. Renaming or moving it will break auth.
- **Tenant switching needs a session refresh.** Server-side `auth.admin.updateUserById(...)` updates `app_metadata`, but the client's JWT cookie is still stale. Always pair the API call with `supabase.auth.refreshSession()` on the client.
- **JWT claim is the source of truth, but membership is the safety net.** A user removed from a tenant whose JWT still claims it gets a 403 from Express ("Active tenant is no longer valid") and is redirected to onboarding by the web.
- **Trigger.dev is optional** — only runs when `TRIGGER_SECRET_KEY` is set.
- **the402 service rename ≠ marketplace rename.** Renaming in [services.ts](apps/api/src/integrations/the402/services.ts) only changes our handler's lookup; the402's `svc_…` listing keeps the old name until you update it in their dashboard or `PATCH /v1/services/<id>`. Mismatch → `unknown_service` 500s.
- **x402 facilitator auth differs by network.** Testnet (`x402.org/facilitator`) needs no auth — `HTTPFacilitatorClient({ url })` works. Mainnet (CDP) needs Ed25519 JWT headers — `HTTPFacilitatorClient(createFacilitatorConfig(id, secret))`. [server.ts](apps/api/src/integrations/x402/server.ts) picks the right one based on whether `CDP_API_KEY_ID` is set.
- **CDP wallet address ≠ chain.** A single EVM EOA works on both Base mainnet *and* Base Sepolia — same `X402_PAY_TO_ADDRESS` across environments. Just funds aren't shared across chains.

## When in doubt

- Setup / commands → the Dev workflow section above.
- Shared types → [packages/types/src/index.ts](packages/types/src/index.ts) (barrel).
- Auth flow on the web → [apps/web/src/proxy.ts](apps/web/src/proxy.ts), [apps/web/src/lib/auth/supabase.ts](apps/web/src/lib/auth/supabase.ts).
- Auth flow on the API → [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts).
- RLS policies → [supabase/migrations/0009_tenant_rls.sql](supabase/migrations/0009_tenant_rls.sql), [0010_jwt_tenancy.sql](supabase/migrations/0010_jwt_tenancy.sql).
- the402 marketplace → [docs/the402.md](docs/the402.md).
- x402 protocol → [docs/x402.md](docs/x402.md).
- Adding params / providers / new services → [docs/extending.md](docs/extending.md).

# Scoop — engineering docs

Scoop is the email-lead-generation product in the sundae_bar agent portfolio. Under the hood it's one service (`findEmails`) reached through **five** different front doors. The same waterfall — Aleads → Apollo → Nymeria → ContactOut, with optional Hunter.io verification — runs no matter which door the request came through. What differs is **who's calling** and **how they pay**.

| Front door | Who uses it | How they pay | Where the auth comes from |
|---|---|---|---|
| **Dashboard** at `/app` | Humans signed into a Supabase tenant | Credits we sell (Stripe-billed) | Supabase JWT |
| **Chat** at `/app/chat` | Humans talking to our AI agent | Credits | Supabase JWT (chat agent uses its tenant's API key under the hood) |
| **MCP** at `/mcp` | Any AI agent given an API key | Credits | API key in `Authorization: Bearer` |
| **the402 marketplace** | Agents browsing the402.ai | USDC on Base, the402 collects | HMAC-signed webhook from the402 |
| **x402 direct** at `/x402/find-email` | Any x402-compatible agent on Base | USDC on Base, directly to our wallet | Signed EIP-3009 payment proof |

The first three are familiar SaaS plumbing. The last two are the "agent-native" rails — they're new, they're how AI agents *discover and transact* without humans in the loop, and they're the most likely source of weird operational questions going forward. Hence these docs.

## Read in this order

1. [the402.md](docs/the402.md) — the **managed marketplace** integration. the402.ai handles the buyer side; we just receive job webhooks and reply with deliverables. Started here because it was the simpler ramp.
2. [x402.md](docs/x402.md) — the **raw protocol** integration. We expose an HTTP endpoint that speaks x402; agents pay us directly in USDC on Base. This is what gets us indexed on agentic.market and the broader x402 ecosystem.
3. [extending.md](docs/extending.md) — playbook for: adding a new input parameter (e.g. `name`, `company`), adding a new sourcing provider, adding a new x402 / the402 service alongside `find_email`.

Auth, billing, Supabase RLS, and the chat agent's internals are covered in the root [CLAUDE.md](CLAUDE.md) (and `agent-starter-plan.md`, if restored from the handoff). These docs only cover the marketplace surfaces.

## Quick orientation

- Service code: [apps/api/src/services/findEmail.ts](apps/api/src/services/findEmail.ts) — the waterfall.
- Provider implementations: [apps/api/src/providers/](apps/api/src/providers/) — one file per data source.
- the402 integration: [apps/api/src/integrations/the402/](apps/api/src/integrations/the402/) — webhook handler, HMAC verifier, service manifest, sync script.
- x402 integration: [apps/api/src/integrations/x402/server.ts](apps/api/src/integrations/x402/server.ts) + [apps/api/src/routes/x402-find-email.ts](apps/api/src/routes/x402-find-email.ts) — the middleware and the post-payment handler.
- Operational scripts: [apps/api/scripts/](apps/api/scripts/) — `the402:sync`, `x402:self-test`, `cdp:create-eoa`, `discovery:poll`.

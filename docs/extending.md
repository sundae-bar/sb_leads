# Extending Scoop — playbook for new params, new providers, new services

Three flavours of extension show up most often. Each one has a different blast radius. Pick the right section.

## 1. Adding a new input parameter (e.g. `name`, `company`, `domain`)

**Scenario**: today buyers can only pass `linkedin_url`. We want to let them pass partial info — a person's name + company — and have Scoop find both the LinkedIn profile *and* the email.

The hard part isn't the schema — it's the *provider* implementation. Most providers can resolve a name+company to an email, but the call shape is different from "resolve a LinkedIn URL." Decide first whether you're (a) adding the parameter as a *hint* to the existing waterfall, or (b) routing to entirely different provider calls. (a) is much cheaper.

### (a) As a hint to the existing waterfall

The `findEmails()` service already accepts a `hints` object — see [findEmail.ts](../apps/api/src/services/findEmail.ts). Hints get passed through to each provider, which uses them opportunistically. The change is purely additive:

1. **Update the `FindEmailHints` type** in [packages/types/src/leads.ts](../packages/types/src/leads.ts) — add `name?: string` and `company_domain?: string` if not already there.
2. **Update each provider** in [apps/api/src/providers/](../apps/api/src/providers/) to use the new hint. Most providers have an optional `request_body.name` or similar — just thread it through.
3. **Update the input surface** for each front door so buyers can actually send the hint:

   | Front door | What to edit |
   |---|---|
   | REST `/find-email` | [apps/api/src/routes/findEmail.ts](../apps/api/src/routes/findEmail.ts) — the `findEmailRequestSchema` zod definition |
   | MCP `find_email` tool | [apps/api/src/mcp/tools.ts](../apps/api/src/mcp/tools.ts) — `inputSchema` |
   | Dashboard form | [apps/web/src/components/leads/email-finder-form.tsx](../apps/web/src/components/leads/email-finder-form.tsx) + the `useLeads` hook |
   | the402 listing | [apps/api/src/integrations/the402/services.ts](../apps/api/src/integrations/the402/services.ts) — `input_schema.properties`. After editing, run `pnpm the402:sync` so the402's catalog reflects the new field. |
   | x402 endpoint | [apps/api/src/routes/x402-find-email.ts](../apps/api/src/routes/x402-find-email.ts) — the `bodySchema` zod definition |

4. **Push and verify**. Run the dashboard, run `x402:self-test` with the new input, fire a job from the402 sandbox.

### (b) As a routed alternative (a new tool entirely)

If "find by name+company" is a fundamentally different operation, it's cleaner to add a *new* service alongside `find_email` — `enrich_person`, say. See section 3.

## 2. Adding a new sourcing provider (e.g. Lusha, RocketReach, ZoomInfo)

Each provider is a single file in [apps/api/src/providers/](../apps/api/src/providers/) implementing the `EmailFinder` interface.

### Steps

1. **Create the provider file**. Copy an existing one (`nymeria.ts` is the simplest reference):
   ```bash
   cp apps/api/src/providers/nymeria.ts apps/api/src/providers/lusha.ts
   ```
2. **Implement two exports**:
   - The HTTP call (whatever the provider's API needs).
   - The `EmailFinder` adapter that maps inputs → their request, response → our `NormalizedEmail[]`.
3. **Register the provider** in [apps/api/src/providers/registry.ts](../apps/api/src/providers/registry.ts):
   - Add to the `finders` record so it's loadable by name.
   - Decide if it joins `DEFAULT_FINDER_CHAIN`. Order matters — the waterfall tries providers in order and stops at the first hit. Cheapest / highest-precision goes first.
4. **Add the provider name** to the `ProviderName` union in [packages/types/src/leads.ts](../packages/types/src/leads.ts) and `ALL_PROVIDER_NAMES` in the registry.
5. **Add the API key env var**:
   - `apps/api/src/config.ts` — extend `config.providers`.
   - `.env.example` — document it.
   - Railway env — add the actual value.
6. **Expose it in the dashboard's provider toggles** (optional but typically wanted):
   - [apps/web/src/components/leads/contacts-table.tsx](../apps/web/src/components/leads/contacts-table.tsx) — `PROVIDER_COLUMNS` constant. The whole UI flows from this list.

### Things to think about

- **Cost.** Where does this provider sit in the waterfall? If it's cheaper-per-hit than what we have today, push it earlier. If more expensive but more accurate, later. The chain order is purely about cost-of-discovery.
- **Rate limits.** Most providers have per-second or per-day caps. The waterfall doesn't currently throttle — a sudden spike in calls could trip a provider's limits and start failing. If this becomes an issue, add a per-provider rate limiter wrapper (the existing `apps/api/src/middleware/rateLimit.ts` LRU pattern is the obvious starting point).
- **Verification.** Some providers return verified emails; some don't. The `normalized.verified` flag is set by the provider — be honest about whether your data source actually verifies or just guesses.
- **Failure modes.** Providers go down. The waterfall logs every attempt to `providers_attempted`; check that yours surfaces a useful `error` string so debug is possible.

### Don't forget

After adding a provider, if it should be visible on the402's listing too, update [services.ts](../apps/api/src/integrations/the402/services.ts) `description` and run `pnpm the402:sync`. The marketplace listing's prose mentions provider names; out-of-date copy = confused buyers.

## 3. Adding a new service alongside `find_email`

**Scenario**: launch a sibling skill — `verify_email`, `enrich_person`, `find_decision_maker`. The pattern is the same regardless of name.

### What to build

1. **The service function**. Put it in [apps/api/src/services/](../apps/api/src/services/), e.g. `verifyEmail.ts`. Same shape as `findEmails()` — takes opts, returns a typed result, no auth concerns.
2. **The MCP tool** in [tools.ts](../apps/api/src/mcp/tools.ts):
   ```ts
   server.registerTool('verify_email', { title, description, inputSchema, … }, async (args) => {
     const guard = await consumeCredits(auth.tenantId, 1);
     if (!guard.ok) return errorContent('out_of_credits');
     // … call your service, refund on empty, return text(result)
   });
   ```
3. **The REST route** (optional, only if humans need it) — see [findEmail.ts route](../apps/api/src/routes/findEmail.ts) as a template. Wire it into [index.ts](../apps/api/src/index.ts) behind `requireLeadsAuth` + `enrichmentLimit`.
4. **The the402 listing** — add a new entry to `LISTED_SERVICES` in [services.ts](../apps/api/src/integrations/the402/services.ts) with its own input_schema / deliverable_schema. Then:
   ```bash
   pnpm --filter @scoop/api the402:sync
   ```
   You'll get back a new `svc_…` id.
5. **The the402 webhook dispatcher** in [webhook.ts](../apps/api/src/integrations/the402/webhook.ts). The handler already finds the right service from `LISTED_SERVICES.find(s => s.name === event.service_name)` — but it then *only* knows how to call `findEmails()`. To dispatch by service:
   ```ts
   switch (service.name) {
     case 'Scoop':         /* current findEmails flow */ break;
     case 'ScoopVerify':   /* call verifyEmail */ break;
     // …
   }
   ```
   For clean code, factor each dispatch into a `services/the402-dispatchers.ts` file once you have three or more.
6. **The x402 route** for direct on-chain access — copy [x402-find-email.ts](../apps/api/src/routes/x402-find-email.ts):
   ```ts
   x402VerifyEmailRouter.post('/x402/verify-email', async (req, res, next) => { … });
   ```
   And update [server.ts](../apps/api/src/integrations/x402/server.ts) to add a second entry to `paymentMiddleware`:
   ```ts
   'POST /x402/verify-email': {
     accepts: [{ scheme: 'exact', price: '$0.05', network, payTo }],
     description: '…',
     mimeType: 'application/json',
     extensions: DISCOVERABLE ? { bazaar: { discoverable: true, category: '…', tags: […] } } : undefined,
   },
   ```

### Pricing strategy

- **Cheaper services first.** Verification is usually 10× cheaper than discovery — `$0.025` vs `$0.25`. Set the x402 price to reflect actual unit cost + healthy margin; agents are price-sensitive in aggregate.
- **the402 mirrors the x402 price.** Keep them aligned so we don't accidentally arbitrage ourselves.
- **Match the marketplace.** Look at what comparable services charge — Clado at $0.20 on agentic.market for similar enrichment, etc.

## 4. Hot-spots you'll want to know

| Concern | Where it lives |
|---|---|
| Credit accounting + refund | [apps/api/src/lib/billing.ts](../apps/api/src/lib/billing.ts) — `consumeCredits`, `refundCredits`. Both paths (the402 + REST) use these. |
| Tenant-scoped RLS | [supabase/migrations/0009_tenant_rls.sql](../supabase/migrations/0009_tenant_rls.sql), [0010_jwt_tenancy.sql](../supabase/migrations/0010_jwt_tenancy.sql) — anything that adds tables needs an RLS policy in the same shape. |
| Provider config types | [packages/types/src/leads.ts](../packages/types/src/leads.ts) — `ProviderName`, `NormalizedEmail`, `FindEmailResult`. New providers must extend `ProviderName`. |
| Rate limiting | [apps/api/src/middleware/rateLimit.ts](../apps/api/src/middleware/rateLimit.ts) — single LRU-based limiter. New external endpoints should be put behind `enrichmentLimit`. |
| Marketplace manifests | [apps/api/src/integrations/the402/services.ts](../apps/api/src/integrations/the402/services.ts) for the402, [apps/api/src/integrations/x402/server.ts](../apps/api/src/integrations/x402/server.ts) for x402. The two manifests should describe identical input/output shapes so behaviour is the same regardless of payment rail. |

## 5. Migrations / things to remember

- **Run `pnpm --filter @scoop/api the402:sync` after touching `services.ts`** — otherwise the402's listing diverges from our manifest.
- **Update Bazaar `tags` on x402** when adding categorically different services. Bazaar's search ranking uses them.
- **Don't forget the deliverable schema.** It's not just documentation — Bazaar exposes it to buyers so their clients know what to parse. If you change what you return, update the schema in the same commit.
- **Test all the front doors after a change.** A schema change can pass typecheck and break only the dashboard form. Run `pnpm typecheck && pnpm build && pnpm x402:self-test` plus a manual smoke test of the dashboard before pushing.

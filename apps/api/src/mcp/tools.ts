import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProviderName } from "../config.js";
import { ALL_PROVIDER_NAMES } from "../providers/registry.js";
import { findEmails } from "../services/findEmail.js";
import { getIntentSignals } from "../services/intentSignals.js";
import { verifyEmail } from "../services/verifyEmail.js";
import { consumeCredits, refundCredits } from "../lib/billing.js";
import { adminDb } from "../db/admin.js";
import { persistContact } from "../db/queries/contacts.js";
import { logger } from "../logger.js";

const providerEnum = z.enum(ALL_PROVIDER_NAMES as [string, ...string[]]);

const hintsShape = {
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  company_domain: z.string().optional(),
  document_id: z.string().optional(),
};

const text = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  structuredContent: data as Record<string, unknown>,
});

const errorContent = (message: string) => ({
  content: [{ type: "text" as const, text: `Error: ${message}` }],
  isError: true,
});

export interface McpAuthContext {
  tenantId: string;
  userId: string;
}

export const registerTools = (server: McpServer, auth: McpAuthContext): void => {
  server.registerTool(
    "find_email",
    {
      title: "Find email",
      description:
        "Find work and/or personal emails across configured providers. Two input modes:\n" +
        "  1. URL mode — pass `linkedin_url` (or `linkedin_urls` for batch).\n" +
        "  2. Name+company mode — pass `full_name` AND one of `company_domain` / `company_name`.\n" +
        "URL mode is preferred when available (more accurate). For name mode, prefer a domain ('cykel.ai') over a free-text name ('Cykel') — most providers match much better against a domain.\n" +
        "Supports waterfall fallback (default) and inline Hunter.io verification. Charges 1 credit per call; refunded automatically if no emails are returned.",
      inputSchema: {
        // URL mode
        linkedin_url: z.string().url().optional(),
        linkedin_urls: z.array(z.string().url()).optional(),
        // Name+company mode
        full_name: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        company_domain: z.string().optional(),
        company_name: z.string().optional(),
        // Common
        providers: z.array(providerEnum).optional(),
        waterfall: z.boolean().default(true),
        email_types: z.array(z.enum(["work", "personal"])).default(["work", "personal"]),
        verify: z.boolean().default(false),
        hints: z.object(hintsShape).optional(),
      },
    },
    async (args) => {
      const urls = args.linkedin_urls ?? (args.linkedin_url ? [args.linkedin_url] : []);
      const hasName = Boolean(args.full_name);
      const hasCompany = Boolean(args.company_domain || args.company_name);

      // Validate input mode. We accept ONE mode per call — mixing URL +
      // name in the same call is intentionally rejected to keep the
      // waterfall semantics simple (each chain is mode-specific).
      if (urls.length === 0 && !hasName) {
        return errorContent(
          "provide either linkedin_url(s) or full_name + company_domain/company_name",
        );
      }
      if (urls.length > 0 && hasName) {
        return errorContent(
          "use either linkedin_url(s) OR name+company in a single call, not both",
        );
      }
      if (hasName && !hasCompany) {
        return errorContent(
          "name mode requires company_domain or company_name (prefer a domain — providers match better)",
        );
      }

      const requestId = randomUUID();
      const guard = await consumeCredits(auth.tenantId, 1, {
        kind: "debit_find",
        description: hasName
          ? `find_email ${args.full_name} @ ${args.company_domain ?? args.company_name}`
          : `find_email ${args.linkedin_url ?? args.linkedin_urls?.join(",")}`,
        refType: "find_email_request",
        refId: requestId,
      });
      if (!guard.ok) {
        return errorContent("out_of_credits");
      }

      // Build the canonical findEmails input. Either urls XOR name_queries
      // is set — the service layer handles either path.
      const findInput = urls.length > 0
        ? {
            linkedin_urls: urls,
            hints: args.hints
              ? Object.fromEntries(urls.map((u) => [u, args.hints]))
              : undefined,
          }
        : {
            name_queries: [
              {
                kind: "name" as const,
                full_name: args.full_name!,
                first_name: args.first_name,
                last_name: args.last_name,
                company_domain: args.company_domain,
                company_name: args.company_name,
              },
            ],
          };

      const results = await findEmails({
        ...findInput,
        providers: args.providers as ProviderName[] | undefined,
        waterfall: args.waterfall ?? true,
        email_types: args.email_types ?? ["work", "personal"],
        verify: args.verify ?? false,
        request_id: requestId,
        tenant_id: auth.tenantId,
      });

      // Mirror the REST route's "no charge on empty result" behaviour.
      const allEmpty = results.every((r) => r.emails.length === 0);
      if (allEmpty) {
        await refundCredits(auth.tenantId, 1, {
          description: "no emails returned — refund",
          refType: "find_email_request",
          refId: requestId,
        });
      }

      // Persist results so list_contacts surfaces them. Skip rows without
      // a LinkedIn URL — `contacts` is keyed by `(tenant_id, linkedin_url)`
      // and we don't synthesise URLs for name-mode lookups that didn't
      // produce one (rare, but possible when no provider returned a
      // canonical URL). Those still appear in the agent's reply, just not
      // in the saved contacts table.
      //
      // NOTE: we persist *before* normalising credits_used below, so the
      // contacts table keeps the real per-provider cost for analytics.
      for (const r of results) {
        if (!r.linkedin_url) continue;
        try {
          await persistContact(auth.tenantId, r);
        } catch (err) {
          logger.error({ err, linkedin_url: r.linkedin_url }, "persistContact failed");
        }
      }

      // Overwrite `credits_used` with the actual tenant billing cost before
      // returning to the model — tenant billing is flat 1-per-call regardless
      // of underlying provider cost. See the long comment in earlier loops.
      const tenantCredit = allEmpty ? 0 : 1;
      for (const r of results) {
        r.credits_used = tenantCredit;
      }

      const isBatch = Array.isArray(args.linkedin_urls);
      return text(
        isBatch
          ? { results, credits_used: tenantCredit }
          : results[0],
      );
    },
  );

  server.registerTool(
    "list_contacts",
    {
      title: "List contacts",
      description:
        "List leads already saved for this tenant — including emails found by previous find_email calls. Free (no credit cost). Use this BEFORE find_email to check whether a lead is already known, so you don't burn a credit re-querying providers.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe(
            "Case-insensitive substring match on the lead's name, company, or LinkedIn handle. Omit to list all.",
          ),
        provider: providerEnum
          .optional()
          .describe(
            "If set, only return leads that have at least one email from this provider.",
          ),
        has_email: z
          .boolean()
          .optional()
          .describe("If true, only return leads that have at least one email."),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      },
    },
    async (args) => {
      // adminDb bypasses RLS — we MUST filter by tenant_id ourselves.
      let query = adminDb
        .from("contacts")
        .select(
          "linkedin_url, person, company, emails, providers_attempted, updated_at",
          { count: "exact" },
        )
        .eq("tenant_id", auth.tenantId)
        .order("updated_at", { ascending: false })
        .range(args.offset, args.offset + args.limit - 1);

      if (args.query) {
        const q = args.query.trim();
        // Search across name (person->>full_name), company (->>name), and the
        // url itself. Use ilike for case-insensitive substring matching.
        const escaped = q.replace(/[,]/g, " ");
        query = query.or(
          [
            `linkedin_url.ilike.%${escaped}%`,
            `person->>full_name.ilike.%${escaped}%`,
            `company->>name.ilike.%${escaped}%`,
          ].join(","),
        );
      }

      const { data, error, count } = await query;
      if (error) {
        return errorContent(`list_contacts failed: ${error.message}`);
      }

      let rows = (data ?? []) as Array<{
        linkedin_url: string;
        person: unknown;
        company: unknown;
        emails: Array<{ source_provider: string }>;
        providers_attempted: unknown;
        updated_at: string;
      }>;

      // Apply post-filters that aren't easy to express in PostgREST.
      if (args.provider) {
        rows = rows.filter((r) =>
          (r.emails ?? []).some((e) => e.source_provider === args.provider),
        );
      }
      if (args.has_email) {
        rows = rows.filter((r) => (r.emails ?? []).length > 0);
      }

      return text({
        total: count ?? rows.length,
        offset: args.offset,
        limit: args.limit,
        contacts: rows,
      });
    },
  );

  server.registerTool(
    "verify_email",
    {
      title: "Verify email",
      description: "Verify that an email address is deliverable. Defaults to Hunter.io.",
      inputSchema: {
        email: z.string().email(),
        provider: providerEnum.optional(),
      },
    },
    async (args) => {
      const result = await verifyEmail({
        email: args.email,
        provider: args.provider as ProviderName | undefined,
        request_id: randomUUID(),
      });
      return text(result);
    },
  );

  server.registerTool(
    "get_intent_signals",
    {
      title: "Get buying intent signals",
      description:
        "Fetch buying intent and company-level signals (funding, news, engagement) for a LinkedIn profile or company domain.",
      inputSchema: {
        linkedin_url: z.string().url().optional(),
        company_domain: z.string().optional(),
        company_name: z.string().optional(),
        providers: z.array(providerEnum).optional(),
      },
    },
    async (args) => {
      if (!args.linkedin_url && !args.company_domain) {
        return errorContent("linkedin_url or company_domain required");
      }
      const result = await getIntentSignals({
        linkedin_url: args.linkedin_url,
        company_domain: args.company_domain,
        company_name: args.company_name,
        providers: args.providers as ProviderName[] | undefined,
        request_id: randomUUID(),
      });
      return text(result);
    },
  );
};

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProviderName } from "../config.js";
import { ALL_PROVIDER_NAMES } from "../providers/registry.js";
import { findEmails } from "../services/findEmail.js";
import { getIntentSignals } from "../services/intentSignals.js";
import { verifyEmail } from "../services/verifyEmail.js";

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

export const registerTools = (server: McpServer): void => {
  server.registerTool(
    "find_email",
    {
      title: "Find email",
      description:
        "Find work and/or personal emails for a LinkedIn profile across configured providers. Supports waterfall fallback and inline verification.",
      inputSchema: {
        linkedin_url: z.string().url().optional(),
        linkedin_urls: z.array(z.string().url()).optional(),
        providers: z.array(providerEnum).optional(),
        waterfall: z.boolean().default(true),
        email_types: z.array(z.enum(["work", "personal"])).default(["work", "personal"]),
        verify: z.boolean().default(false),
        hints: z.object(hintsShape).optional(),
      },
    },
    async (args) => {
      const urls = args.linkedin_urls ?? (args.linkedin_url ? [args.linkedin_url] : []);
      if (urls.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Error: linkedin_url or linkedin_urls required" }],
          isError: true,
        };
      }
      const results = await findEmails({
        linkedin_urls: urls,
        providers: args.providers as ProviderName[] | undefined,
        waterfall: args.waterfall ?? true,
        email_types: args.email_types ?? ["work", "personal"],
        verify: args.verify ?? false,
        hints: args.hints
          ? Object.fromEntries(urls.map((u) => [u, args.hints]))
          : undefined,
        request_id: randomUUID(),
      });
      const isBatch = Array.isArray(args.linkedin_urls);
      return text(
        isBatch
          ? {
              results,
              credits_used: results.reduce((acc, r) => acc + r.credits_used, 0),
            }
          : results[0],
      );
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
        return {
          content: [
            { type: "text" as const, text: "Error: linkedin_url or company_domain required" },
          ],
          isError: true,
        };
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

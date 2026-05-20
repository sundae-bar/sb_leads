import { z } from "zod";
import { ALL_PROVIDER_NAMES } from "../providers/registry.js";

const providerEnum = z.enum(ALL_PROVIDER_NAMES as [string, ...string[]]);

const hintsSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    company_domain: z.string().optional(),
    company_name: z.string().optional(),
    document_id: z.string().optional(),
  })
  .optional();

/**
 * Find-email request. Accepts two input modes:
 *
 *   1. URL mode  — `linkedin_url` (single) or `linkedin_urls` (batch).
 *   2. Name mode — `full_name` plus one of `company_domain` / `company_name`.
 *      `first_name` and `last_name` are optional refinements.
 *
 * Both modes can't be combined in a single call — the validator below
 * rejects mixed input to keep the service-layer chain selection clean.
 */
export const findEmailRequestSchema = z
  .object({
    // URL mode
    linkedin_url: z.string().url().optional(),
    linkedin_urls: z.array(z.string().url()).optional(),
    // Name mode
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_domain: z.string().optional(),
    company_name: z.string().optional(),
    // Common
    provider: providerEnum.optional(),
    providers: z.array(providerEnum).optional(),
    waterfall: z.boolean().optional(),
    email_types: z.array(z.enum(["work", "personal"])).optional(),
    verify: z.boolean().optional(),
    hints: hintsSchema,
    hints_by_url: z.record(z.string(), hintsSchema).optional(),
  })
  .refine(
    (v) => {
      const hasUrl = Boolean(
        v.linkedin_url || (v.linkedin_urls && v.linkedin_urls.length > 0),
      );
      const hasName = Boolean(v.full_name);
      const hasCompany = Boolean(v.company_domain || v.company_name);
      if (hasUrl && hasName) return false; // pick one mode per call
      if (hasUrl) return true;
      return hasName && hasCompany;
    },
    {
      message:
        "provide either linkedin_url(s) OR full_name + company_domain/company_name (not both)",
    },
  );

export type FindEmailRequest = z.infer<typeof findEmailRequestSchema>;

export const verifyEmailRequestSchema = z.object({
  email: z.string().email(),
  provider: providerEnum.optional(),
});

export const intentRequestSchema = z
  .object({
    linkedin_url: z.string().url().optional(),
    company_domain: z.string().optional(),
    company_name: z.string().optional(),
    providers: z.array(providerEnum).optional(),
  })
  .refine((v) => Boolean(v.linkedin_url || v.company_domain), {
    message: "linkedin_url or company_domain is required",
  });

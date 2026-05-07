import { z } from "zod";
import { ALL_PROVIDER_NAMES } from "../providers/registry.js";

const providerEnum = z.enum(ALL_PROVIDER_NAMES as [string, ...string[]]);

const hintsSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    company_domain: z.string().optional(),
    document_id: z.string().optional(),
  })
  .optional();

export const findEmailRequestSchema = z
  .object({
    linkedin_url: z.string().url().optional(),
    linkedin_urls: z.array(z.string().url()).optional(),
    provider: providerEnum.optional(),
    providers: z.array(providerEnum).optional(),
    waterfall: z.boolean().optional(),
    email_types: z.array(z.enum(["work", "personal"])).optional(),
    verify: z.boolean().optional(),
    hints: hintsSchema,
    hints_by_url: z.record(z.string(), hintsSchema).optional(),
  })
  .refine(
    (v) => Boolean(v.linkedin_url || (v.linkedin_urls && v.linkedin_urls.length > 0)),
    { message: "linkedin_url or linkedin_urls is required" },
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

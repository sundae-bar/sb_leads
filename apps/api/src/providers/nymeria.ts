import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { PROVIDER_CREDITS } from "./credits.js";
import type {
  EmailFinder,
  FindEmailsInput,
  FindEmailsOutput,
  PerUrlFinderResult,
} from "./types.js";
import { ProviderError } from "./types.js";
import { type LeadIdentifier, type NormalizedEmail, leadKey } from "@scoop/types";

const BASE = "https://www.nymeria.io/api/v4";
const BATCH_SIZE = 30;

interface NymeriaPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  job_title?: string;
  job_company_name?: string;
  job_company_website?: string;
  industry?: string;
  linkedin_url?: string;
  work_email?: string;
  personal_emails?: string[];
  location_name?: string;
  location_country?: string;
}

interface NymeriaResponse {
  status?: number;
  data?: NymeriaPerson;
  error?: { message?: string };
}

const headers = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "X-API-Key": config.providers.nymeria,
});

const personToResult = (
  key: string,
  fallbackUrl: string,
  p: NymeriaPerson | undefined,
  emailTypes: ReadonlyArray<"work" | "personal">,
): PerUrlFinderResult => {
  if (!p) return { lead_key: key, linkedin_url: fallbackUrl, emails: [] };
  const emails: NormalizedEmail[] = [];
  if (emailTypes.includes("work") && p.work_email) {
    emails.push({
      address: p.work_email,
      type: "work",
      verified: true,
      verification_status: "valid",
      source_provider: "nymeria",
      verified_by: null,
    });
  }
  if (emailTypes.includes("personal")) {
    for (const e of p.personal_emails ?? []) {
      emails.push({
        address: e,
        type: "personal",
        verified: true,
        verification_status: "valid",
        source_provider: "nymeria",
        verified_by: null,
      });
    }
  }
  return {
    lead_key: key,
    linkedin_url: p.linkedin_url ?? fallbackUrl,
    emails,
    person: {
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.full_name,
      title: p.job_title,
      location: [p.location_name, p.location_country].filter(Boolean).join(", ") || undefined,
      linkedin_url: p.linkedin_url ?? fallbackUrl,
    },
    company: p.job_company_name
      ? {
          name: p.job_company_name,
          domain: p.job_company_website,
          industry: p.industry,
        }
      : undefined,
  };
};

/**
 * Bulk enrich — Nymeria's batch endpoint takes a list of `params` objects.
 * Each request can use either `profile` (URL) or name+company params.
 * Mixed batches are fine; we attach our `lead_key` as metadata to match
 * responses back even though Nymeria preserves request order.
 */
const enrichBulk = async (
  leads: LeadIdentifier[],
): Promise<Array<NymeriaPerson | undefined>> => {
  const requests = leads.map((lead) => {
    if (lead.kind === "linkedin") {
      return {
        params: { profile: lead.linkedin_url },
        metadata: { lead_key: leadKey(lead) },
      };
    }
    return {
      params: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        full_name: lead.full_name,
        company: lead.company_name,
        domain: lead.company_domain,
      },
      metadata: { lead_key: leadKey(lead) },
    };
  });
  const res = await request(`${BASE}/person/enrich/bulk`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ requests }),
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("nymeria", `bulk ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as NymeriaResponse[];
  return leads.map((_, i) => json[i]?.data);
};

export const nymeriaFinder: EmailFinder = {
  name: "nymeria",
  async findEmails(input: FindEmailsInput): Promise<FindEmailsOutput> {
    const { leads, email_types } = input;
    const persons: Array<NymeriaPerson | undefined> = [];
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const chunk = leads.slice(i, i + BATCH_SIZE);
      try {
        const batch = await enrichBulk(chunk);
        persons.push(...batch);
      } catch (err) {
        logger.warn({ err }, "nymeria batch failed");
        persons.push(...chunk.map(() => undefined));
      }
    }
    const results = leads.map((lead, i) =>
      personToResult(
        leadKey(lead),
        lead.kind === "linkedin" ? lead.linkedin_url : "",
        persons[i],
        email_types,
      ),
    );
    return {
      results,
      credits_used: PROVIDER_CREDITS.nymeria.find * leads.length,
    };
  },
};

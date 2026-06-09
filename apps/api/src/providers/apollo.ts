import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { PROVIDER_CREDITS } from "./credits.js";
import type {
  EmailFinder,
  FindEmailsInput,
  FindEmailsOutput,
  IntentInput,
  IntentOutput,
  IntentProvider,
  PerUrlFinderResult,
} from "./types.js";
import { ProviderError } from "./types.js";
import { type IntentSignal, type LeadIdentifier, type NormalizedEmail, leadKey } from "@scoop/types";

const BASE = "https://api.apollo.io/api/v1";

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  linkedin_url?: string;
  title?: string;
  email?: string;
  email_status?: string;
  extrapolated_email_confidence?: number;
  personal_emails?: string[];
  organization?: { name?: string; website_url?: string; industry?: string };
  city?: string;
  country?: string;
  is_likely_to_engage?: boolean;
  intent_strength?: number | null;
  show_intent?: boolean;
}

const headers = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "x-api-key": config.providers.apollo,
});

const isVerifiedStatus = (status: string | undefined): boolean =>
  status === "verified" || status === "likely_to_engage";

const personToResult = (
  leadKeyValue: string,
  fallbackUrl: string,
  p: ApolloPerson | undefined,
  emailTypes: ReadonlyArray<"work" | "personal">,
): PerUrlFinderResult => {
  if (!p) {
    return { lead_key: leadKeyValue, linkedin_url: fallbackUrl, emails: [] };
  }
  const emails: NormalizedEmail[] = [];
  const wantWork = emailTypes.includes("work");
  const wantPersonal = emailTypes.includes("personal");

  if (wantWork && p.email) {
    emails.push({
      address: p.email,
      type: "work",
      verified: isVerifiedStatus(p.email_status),
      verification_status: p.email_status,
      confidence: p.extrapolated_email_confidence,
      source_provider: "apollo",
      verified_by: isVerifiedStatus(p.email_status) ? null : undefined,
    });
  }
  if (wantPersonal) {
    for (const pe of p.personal_emails ?? []) {
      emails.push({
        address: pe,
        type: "personal",
        verified: false,
        source_provider: "apollo",
      });
    }
  }
  return {
    lead_key: leadKeyValue,
    // For name-mode queries we don't have a URL up front; trust Apollo's
    // response. For URL-mode queries we prefer Apollo's URL too (it may be
    // a canonical form), falling back to the one we sent in.
    linkedin_url: p.linkedin_url ?? fallbackUrl,
    emails,
    person: {
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.name,
      title: p.title,
      location: [p.city, p.country].filter(Boolean).join(", ") || undefined,
      linkedin_url: p.linkedin_url ?? fallbackUrl,
    },
    company: p.organization
      ? {
          name: p.organization.name,
          domain: p.organization.website_url?.replace(/^https?:\/\//, "").replace(/\/$/, ""),
          industry: p.organization.industry,
        }
      : undefined,
  };
};

interface MatchParams {
  /** URL-mode lookup. */
  linkedin_url?: string;
  /** Name-mode lookup — at least one of domain/org_name required alongside the name. */
  first_name?: string;
  last_name?: string;
  name?: string;
  domain?: string;
  organization_name?: string;
}

/**
 * One call to /people/match. Apollo's docs say this endpoint accepts EITHER
 * a linkedin_url OR a name+org pair — we pass through whichever we have.
 */
const matchOne = async (
  params: MatchParams,
  signal?: AbortSignal,
): Promise<ApolloPerson | undefined> => {
  const u = new URL(`${BASE}/people/match`);
  if (params.linkedin_url) u.searchParams.set("linkedin_url", params.linkedin_url);
  if (params.first_name) u.searchParams.set("first_name", params.first_name);
  if (params.last_name) u.searchParams.set("last_name", params.last_name);
  if (params.name) u.searchParams.set("name", params.name);
  if (params.domain) u.searchParams.set("domain", params.domain);
  if (params.organization_name) {
    u.searchParams.set("organization_name", params.organization_name);
  }
  u.searchParams.set("reveal_personal_emails", "true");
  const res = await request(u, { method: "POST", headers: headers(), signal });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("apollo", `people/match ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { person?: ApolloPerson };
  return json.person;
};

/**
 * Bulk match — URL-mode only. Apollo's bulk_match endpoint takes an array
 * of `{ linkedin_url }` and is much cheaper per call than N single matches.
 * For name-mode queries we fall back to N sequential matchOne calls (Apollo
 * doesn't have a bulk name-match endpoint).
 */
const matchBulk = async (
  urls: string[],
  signal?: AbortSignal,
): Promise<Array<ApolloPerson | undefined>> => {
  const u = new URL(`${BASE}/people/bulk_match`);
  u.searchParams.set("reveal_personal_emails", "true");
  const res = await request(u, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ details: urls.map((linkedin_url) => ({ linkedin_url })) }),
    signal,
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("apollo", `bulk_match ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { matches?: Array<ApolloPerson | null> };
  return (json.matches ?? []).map((m) => m ?? undefined);
};

const matchForLead = async (
  lead: LeadIdentifier,
  signal?: AbortSignal,
): Promise<ApolloPerson | undefined> => {
  if (lead.kind === "linkedin") {
    return matchOne({ linkedin_url: lead.linkedin_url }, signal);
  }
  return matchOne(
    {
      name: lead.full_name,
      first_name: lead.first_name,
      last_name: lead.last_name,
      domain: lead.company_domain,
      organization_name: lead.company_name,
    },
    signal,
  );
};

export const apolloFinder: EmailFinder = {
  name: "apollo",
  async findEmails(input: FindEmailsInput): Promise<FindEmailsOutput> {
    const { leads, email_types } = input;

    // Partition: URLs can ride the bulk endpoint; name queries can't and
    // run in parallel through matchOne.
    const urlLeads = leads.filter((l) => l.kind === "linkedin") as Array<
      Extract<LeadIdentifier, { kind: "linkedin" }>
    >;
    const nameLeads = leads.filter((l) => l.kind === "name");

    const personByKey = new Map<string, ApolloPerson | undefined>();

    // URL leads — use bulk if there are more than two, otherwise individual.
    if (urlLeads.length > 0) {
      if (urlLeads.length <= 2) {
        await Promise.all(
          urlLeads.map(async (l) => {
            try {
              personByKey.set(
                leadKey(l),
                await matchOne({ linkedin_url: l.linkedin_url }, input.signal),
              );
            } catch (err) {
              logger.warn({ err, lead: l }, "apollo single URL match failed");
              personByKey.set(leadKey(l), undefined);
            }
          }),
        );
      } else {
        for (let i = 0; i < urlLeads.length; i += 10) {
          if (input.signal?.aborted) break; // caller stopped waiting
          const chunk = urlLeads.slice(i, i + 10);
          try {
            const matches = await matchBulk(
              chunk.map((l) => l.linkedin_url),
              input.signal,
            );
            chunk.forEach((l, idx) => personByKey.set(leadKey(l), matches[idx]));
          } catch (err) {
            logger.warn({ err, count: chunk.length }, "apollo bulk match failed");
            for (const l of chunk) personByKey.set(leadKey(l), undefined);
          }
        }
      }
    }

    // Name leads — sequential matchOne. Apollo's name-mode lookup is rate-
    // limited more aggressively than URL bulk, so we don't fan them all
    // out at once. In practice the chat agent calls these one-at-a-time
    // anyway.
    for (const l of nameLeads) {
      if (input.signal?.aborted) break; // caller stopped waiting
      try {
        personByKey.set(leadKey(l), await matchForLead(l, input.signal));
      } catch (err) {
        logger.warn({ err, lead: l }, "apollo name match failed");
        personByKey.set(leadKey(l), undefined);
      }
    }

    const results: PerUrlFinderResult[] = leads.map((l) => {
      const key = leadKey(l);
      const fallback = l.kind === "linkedin" ? l.linkedin_url : "";
      return personToResult(key, fallback, personByKey.get(key), email_types);
    });

    return {
      results,
      credits_used: PROVIDER_CREDITS.apollo.find * leads.length,
    };
  },
};

export const apolloIntent: IntentProvider = {
  name: "apollo",
  async getCompanyIntent(input: IntentInput): Promise<IntentOutput> {
    if (!input.linkedin_url) {
      return { company: {}, signals: [], credits_used: 0 };
    }
    let person: ApolloPerson | undefined;
    try {
      person = await matchOne({ linkedin_url: input.linkedin_url });
    } catch (err) {
      logger.warn({ err }, "apollo intent match failed");
      return { company: {}, signals: [], credits_used: PROVIDER_CREDITS.apollo.intent };
    }
    const signals: IntentSignal[] = [];
    if (person?.is_likely_to_engage !== undefined) {
      signals.push({
        type: "likely_to_engage",
        value: person.is_likely_to_engage,
        source_provider: "apollo",
      });
    }
    if (person?.intent_strength != null) {
      signals.push({
        type: "intent_strength",
        value: person.intent_strength,
        source_provider: "apollo",
      });
    }
    if (person?.show_intent !== undefined) {
      signals.push({
        type: "show_intent",
        value: person.show_intent,
        source_provider: "apollo",
      });
    }
    return {
      company: person?.organization
        ? {
            name: person.organization.name,
            domain: person.organization.website_url
              ?.replace(/^https?:\/\//, "")
              .replace(/\/$/, ""),
            industry: person.organization.industry,
          }
        : {},
      signals,
      credits_used: PROVIDER_CREDITS.apollo.intent,
    };
  },
};

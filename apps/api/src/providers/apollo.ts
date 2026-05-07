import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../logger.js";
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
import type { IntentSignal, NormalizedEmail } from "@sundae/types";

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
  url: string,
  p: ApolloPerson | undefined,
  emailTypes: ReadonlyArray<"work" | "personal">,
): PerUrlFinderResult => {
  if (!p) return { linkedin_url: url, emails: [] };
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
    linkedin_url: url,
    emails,
    person: {
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.name,
      title: p.title,
      location: [p.city, p.country].filter(Boolean).join(", ") || undefined,
      linkedin_url: p.linkedin_url ?? url,
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

const matchOne = async (url: string): Promise<ApolloPerson | undefined> => {
  const u = new URL(`${BASE}/people/match`);
  u.searchParams.set("linkedin_url", url);
  u.searchParams.set("reveal_personal_emails", "true");
  const res = await request(u, { method: "POST", headers: headers() });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("apollo", `people/match ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { person?: ApolloPerson };
  return json.person;
};

const matchBulk = async (urls: string[]): Promise<Array<ApolloPerson | undefined>> => {
  const u = new URL(`${BASE}/people/bulk_match`);
  u.searchParams.set("reveal_personal_emails", "true");
  const res = await request(u, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ details: urls.map((linkedin_url) => ({ linkedin_url })) }),
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("apollo", `bulk_match ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { matches?: Array<ApolloPerson | null> };
  return (json.matches ?? []).map((m) => m ?? undefined);
};

export const apolloFinder: EmailFinder = {
  name: "apollo",
  async findEmails(input: FindEmailsInput): Promise<FindEmailsOutput> {
    const urls = input.linkedin_urls;
    let persons: Array<ApolloPerson | undefined> = [];
    if (urls.length <= 2) {
      persons = await Promise.all(
        urls.map(async (u) => {
          try {
            return await matchOne(u);
          } catch (err) {
            logger.warn({ err, url: u }, "apollo single match failed");
            return undefined;
          }
        }),
      );
    } else {
      for (let i = 0; i < urls.length; i += 10) {
        const chunk = urls.slice(i, i + 10);
        try {
          const matches = await matchBulk(chunk);
          persons.push(...matches);
        } catch (err) {
          logger.warn({ err, chunk }, "apollo bulk match failed");
          persons.push(...chunk.map(() => undefined));
        }
      }
    }
    const results = urls.map((u, i) => personToResult(u, persons[i], input.email_types));
    return { results, credits_used: urls.length };
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
      person = await matchOne(input.linkedin_url);
    } catch (err) {
      logger.warn({ err }, "apollo intent match failed");
      return { company: {}, signals: [], credits_used: 1 };
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
      credits_used: 1,
    };
  },
};

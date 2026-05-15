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
import type { FindEmailHints, IntentSignal, NormalizedEmail } from "@scoop/types";

const BASE = "https://api.a-leads.co/gateway/v1";
const PLACEHOLDER_EMAIL_RE = /email_not_unlocked@/i;

interface AleadsContact {
  member_id?: number;
  member_full_name?: string;
  member_first_name?: string;
  member_last_name?: string;
  member_linkedin_url?: string;
  job_title?: string;
  company_name?: string;
  domain?: string;
  industry?: string;
  email_found?: boolean;
  document_id?: string;
  member_location_raw_address?: string;
  _aleads_company_id?: string;
}

const headers = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "x-api-key": config.providers.aleads,
});

const linkedinUsernameFromUrl = (url: string): string => {
  const m = /linkedin\.com\/in\/([^/?#]+)/i.exec(url);
  return m?.[1] ?? "";
};

const searchByLinkedinUsername = async (
  username: string,
): Promise<AleadsContact | null> => {
  const body = {
    advanced_filters: { linkedin_username: [username] },
    current_page: 0,
    search_type: "total",
  };
  const res = await request(`${BASE}/search/advanced-search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("aleads", `advanced-search ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as {
    data?: { results?: AleadsContact[] };
  };
  return json.data?.results?.[0] ?? null;
};

const unlockEmail = async (
  contact: AleadsContact,
  hints: FindEmailHints | undefined,
  type: "personal" | "work",
): Promise<string | null> => {
  const documentId = hints?.document_id ?? contact.document_id;
  const firstName = hints?.first_name ?? contact.member_first_name ?? "";
  const lastName = hints?.last_name ?? contact.member_last_name ?? "";
  const website = hints?.company_domain ?? contact.domain ?? "";
  if (!documentId || !firstName || !lastName || !website) return null;

  const path = type === "personal" ? "/search/find-email/personal" : "/search/find-email";
  const res = await request(`${BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: {
        first_name: firstName,
        last_name: lastName,
        website,
        document_id: documentId,
        linkedin_username: contact.member_linkedin_url
          ? linkedinUsernameFromUrl(contact.member_linkedin_url)
          : "",
      },
    }),
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("aleads", `find-email ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { data?: { email?: string } };
  const email = json.data?.email;
  if (!email || PLACEHOLDER_EMAIL_RE.test(email)) return null;
  return email;
};

const findOne = async (
  url: string,
  emailTypes: ReadonlyArray<"work" | "personal">,
  hints?: FindEmailHints,
): Promise<{ result: PerUrlFinderResult; credits: number }> => {
  const username = linkedinUsernameFromUrl(url);
  if (!username) {
    return {
      result: { linkedin_url: url, emails: [] },
      credits: 0,
    };
  }
  let credits = 0;
  const contact = await searchByLinkedinUsername(username);
  credits += 1;
  if (!contact) {
    return { result: { linkedin_url: url, emails: [] }, credits };
  }
  const emails: NormalizedEmail[] = [];
  for (const type of emailTypes) {
    try {
      const email = await unlockEmail(contact, hints, type);
      credits += 1;
      if (email) {
        emails.push({
          address: email,
          type,
          verified: true,
          verification_status: "valid",
          source_provider: "aleads",
          verified_by: null,
        });
      }
    } catch (err) {
      logger.warn({ err, url, type }, "aleads unlock failed");
    }
  }
  return {
    result: {
      linkedin_url: url,
      emails,
      person: {
        first_name: contact.member_first_name,
        last_name: contact.member_last_name,
        full_name: contact.member_full_name,
        title: contact.job_title,
        location: contact.member_location_raw_address,
        linkedin_url: contact.member_linkedin_url ?? url,
      },
      company: {
        name: contact.company_name,
        domain: contact.domain,
        industry: contact.industry,
      },
    },
    credits,
  };
};

export const aleadsFinder: EmailFinder = {
  name: "aleads",
  async findEmails(input: FindEmailsInput): Promise<FindEmailsOutput> {
    const out: PerUrlFinderResult[] = [];
    let credits = 0;
    for (const url of input.linkedin_urls) {
      const hints = input.hints?.[url];
      const { result, credits: c } = await findOne(url, input.email_types, hints);
      credits += c;
      out.push(result);
    }
    return { results: out, credits_used: credits };
  },
};

export const aleadsIntent: IntentProvider = {
  name: "aleads",
  async getCompanyIntent(input: IntentInput): Promise<IntentOutput> {
    if (!input.company_domain) {
      return {
        company: {},
        signals: [],
        credits_used: 0,
      };
    }
    const res = await request(`${BASE}/company-search/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        company_filters: { organizations: [input.company_domain] },
        current_page: 0,
      }),
    });
    if (res.statusCode >= 400) {
      const text = await res.body.text();
      throw new ProviderError("aleads", `company-search ${res.statusCode}: ${text}`);
    }
    const json = (await res.body.json()) as {
      data?: {
        results?: Array<{
          domain?: string;
          company_name?: string;
          industry?: string;
          funding_rounds?: Array<{ amount?: string; round?: string; date?: string; url?: string }>;
          news_articles?: Array<{ title?: string; url?: string; date?: string; snippet?: string }>;
        }>;
      };
    };
    const co = json.data?.results?.[0];
    const signals: IntentSignal[] = [];
    for (const r of co?.funding_rounds ?? []) {
      signals.push({
        type: "funding_round",
        description: [r.round, r.amount].filter(Boolean).join(" "),
        date: r.date,
        url: r.url,
        source_provider: "aleads",
      });
    }
    for (const n of co?.news_articles ?? []) {
      signals.push({
        type: "news",
        description: n.title,
        url: n.url,
        date: n.date,
        snippet: n.snippet,
        source_provider: "aleads",
      });
    }
    return {
      company: {
        name: co?.company_name,
        domain: co?.domain,
        industry: co?.industry,
      },
      signals,
      credits_used: 1,
    };
  },
};

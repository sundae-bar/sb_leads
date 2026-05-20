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
import { PROVIDER_CREDITS } from "./credits.js";
import {
  type FindEmailHints,
  type IntentSignal,
  type LeadIdentifier,
  type NormalizedEmail,
  leadKey,
} from "@scoop/types";

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

const advancedSearch = async (
  filters: Record<string, unknown>,
): Promise<AleadsContact | null> => {
  const res = await request(`${BASE}/search/advanced-search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      advanced_filters: filters,
      current_page: 0,
      search_type: "total",
    }),
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

const searchByLinkedinUsername = (username: string) =>
  advancedSearch({ linkedin_username: [username] });

/**
 * Name-mode search. Aleads' advanced-search accepts free-text filters on
 * name and company; we hand it the full_name and either the domain or the
 * company name. If both name and domain match a record, Aleads returns the
 * contact + document_id we need for the subsequent email unlock.
 */
const searchByName = (
  fullName: string,
  domain: string | undefined,
  companyName: string | undefined,
) => {
  const filters: Record<string, unknown> = { name: [fullName] };
  if (domain) filters.domain = [domain];
  else if (companyName) filters.company_name = [companyName];
  return advancedSearch(filters);
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

/**
 * Resolve a contact for one lead — either by LinkedIn username (URL mode)
 * or by name + domain/company (name mode). Returns the raw AleadsContact +
 * the per-step credits used so the caller can attribute them.
 */
const searchForLead = async (
  lead: LeadIdentifier,
): Promise<{ contact: AleadsContact | null; searchCredits: number }> => {
  if (lead.kind === "linkedin") {
    const username = linkedinUsernameFromUrl(lead.linkedin_url);
    if (!username) return { contact: null, searchCredits: 0 };
    const contact = await searchByLinkedinUsername(username);
    return { contact, searchCredits: PROVIDER_CREDITS.aleads.search };
  }
  const contact = await searchByName(
    lead.full_name,
    lead.company_domain,
    lead.company_name,
  );
  return { contact, searchCredits: PROVIDER_CREDITS.aleads.search };
};

/**
 * Merge upstream contact data with the caller's hints so unlockEmail() has
 * the strongest possible signal. For name-mode queries the lead itself
 * carries the name + domain we need; URL-mode pulls them from the contact
 * record. Either way, hints (if provided) win over both.
 */
const hintsForLead = (
  lead: LeadIdentifier,
  contact: AleadsContact,
  upstreamHints: FindEmailHints | undefined,
): FindEmailHints => {
  const base: FindEmailHints = lead.kind === "name"
    ? {
        first_name: lead.first_name,
        last_name: lead.last_name,
        full_name: lead.full_name,
        company_domain: lead.company_domain,
        company_name: lead.company_name,
      }
    : {};
  return { ...base, ...upstreamHints, document_id: contact.document_id ?? upstreamHints?.document_id };
};

const findOne = async (
  lead: LeadIdentifier,
  emailTypes: ReadonlyArray<"work" | "personal">,
  upstreamHints?: FindEmailHints,
): Promise<{ result: PerUrlFinderResult; credits: number }> => {
  const fallbackUrl = lead.kind === "linkedin" ? lead.linkedin_url : "";
  const key = leadKey(lead);

  let credits = 0;
  const { contact, searchCredits } = await searchForLead(lead);
  credits += searchCredits;

  if (!contact) {
    return {
      result: { lead_key: key, linkedin_url: fallbackUrl, emails: [] },
      credits,
    };
  }

  const hints = hintsForLead(lead, contact, upstreamHints);
  const emails: NormalizedEmail[] = [];
  for (const type of emailTypes) {
    try {
      const email = await unlockEmail(contact, hints, type);
      credits += PROVIDER_CREDITS.aleads.find;
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
      logger.warn({ err, lead, type }, "aleads unlock failed");
    }
  }

  return {
    result: {
      lead_key: key,
      linkedin_url: contact.member_linkedin_url ?? fallbackUrl,
      emails,
      person: {
        first_name: contact.member_first_name,
        last_name: contact.member_last_name,
        full_name: contact.member_full_name,
        title: contact.job_title,
        location: contact.member_location_raw_address,
        linkedin_url: contact.member_linkedin_url ?? fallbackUrl,
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
    for (const lead of input.leads) {
      // Hints keyed by URL only make sense for URL-mode leads. Name-mode
      // queries carry their own context on the LeadIdentifier itself.
      const hints =
        lead.kind === "linkedin" ? input.hints?.[lead.linkedin_url] : undefined;
      const { result, credits: c } = await findOne(lead, input.email_types, hints);
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
      credits_used: PROVIDER_CREDITS.aleads.intent,
    };
  },
};

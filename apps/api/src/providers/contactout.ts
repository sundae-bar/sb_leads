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

const BASE = "https://api.contactout.com/v1";

interface ContactoutSingleProfile {
  url?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string[];
  work_email?: string[];
  personal_email?: string[];
  work_email_status?: string[];
  title?: string;
  company?: { name?: string; domain?: string };
  location?: string;
}

const headers = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  token: config.providers.contactout,
});

/** URL-mode lookup. */
const fetchByUrl = async (
  url: string,
  signal?: AbortSignal,
): Promise<ContactoutSingleProfile | undefined> => {
  const u = new URL(`${BASE}/people/linkedin`);
  u.searchParams.set("profile", url);
  u.searchParams.set("include_phone", "false");
  const res = await request(u, { method: "GET", headers: headers(), signal });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("contactout", `single ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { profile?: ContactoutSingleProfile };
  return json.profile;
};

/**
 * Name-mode lookup via ContactOut's email-finder endpoint. Requires at
 * least first_name + last_name + domain. If only a company name is given
 * (no domain) we fail upstream — domain is mandatory for ContactOut.
 */
const fetchByName = async (
  firstName: string | undefined,
  lastName: string | undefined,
  domain: string | undefined,
  signal?: AbortSignal,
): Promise<ContactoutSingleProfile | undefined> => {
  if (!firstName || !lastName || !domain) return undefined;
  const u = new URL(`${BASE}/email_finder`);
  u.searchParams.set("first_name", firstName);
  u.searchParams.set("last_name", lastName);
  u.searchParams.set("domain", domain);
  const res = await request(u, { method: "GET", headers: headers(), signal });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("contactout", `email_finder ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { profile?: ContactoutSingleProfile };
  return json.profile;
};

const splitName = (full: string): { first?: string; last?: string } => {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0], last: undefined };
  return { first: parts[0], last: parts.slice(1).join(" ") };
};

const fetchForLead = async (
  lead: LeadIdentifier,
  signal?: AbortSignal,
): Promise<ContactoutSingleProfile | undefined> => {
  if (lead.kind === "linkedin") return fetchByUrl(lead.linkedin_url, signal);
  const split = splitName(lead.full_name);
  return fetchByName(
    lead.first_name ?? split.first,
    lead.last_name ?? split.last,
    lead.company_domain,
    signal,
  );
};

const profileToResult = (
  key: string,
  fallbackUrl: string,
  p: ContactoutSingleProfile | undefined,
  emailTypes: ReadonlyArray<"work" | "personal">,
): PerUrlFinderResult => {
  if (!p) return { lead_key: key, linkedin_url: fallbackUrl, emails: [] };
  const emails: NormalizedEmail[] = [];
  if (emailTypes.includes("work")) {
    const statuses = p.work_email_status ?? [];
    (p.work_email ?? []).forEach((address, i) => {
      const status = statuses[i];
      emails.push({
        address,
        type: "work",
        verified: status === "valid",
        verification_status: status,
        source_provider: "contactout",
        verified_by: status === "valid" ? null : undefined,
      });
    });
  }
  if (emailTypes.includes("personal")) {
    for (const address of p.personal_email ?? []) {
      emails.push({
        address,
        type: "personal",
        verified: false,
        source_provider: "contactout",
      });
    }
  }
  return {
    lead_key: key,
    linkedin_url: p.url ?? fallbackUrl,
    emails,
    person: {
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.full_name,
      title: p.title,
      location: p.location,
      linkedin_url: p.url ?? fallbackUrl,
    },
    company: p.company,
  };
};

export const contactoutFinder: EmailFinder = {
  name: "contactout",
  async findEmails(input: FindEmailsInput): Promise<FindEmailsOutput> {
    const { leads, email_types } = input;
    const profiles = await Promise.all(
      leads.map(async (lead) => {
        if (input.signal?.aborted) return undefined; // caller stopped waiting
        try {
          return await fetchForLead(lead, input.signal);
        } catch (err) {
          logger.warn({ err, lead }, "contactout fetch failed");
          return undefined;
        }
      }),
    );
    const results = leads.map((lead, i) =>
      profileToResult(
        leadKey(lead),
        lead.kind === "linkedin" ? lead.linkedin_url : "",
        profiles[i],
        email_types,
      ),
    );
    return {
      results,
      credits_used: PROVIDER_CREDITS.contactout.find * leads.length,
    };
  },
};

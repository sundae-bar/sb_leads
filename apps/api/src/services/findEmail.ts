import type { ProviderName } from "../config.js";
import { isProviderConfigured } from "../config.js";
import { logCredit } from "../credits.js";
import { logger } from "../logger.js";
import {
  DEFAULT_FINDER_CHAIN,
  DEFAULT_VERIFIER,
  NAME_MODE_FINDER_CHAIN,
  finders,
  verifiers,
} from "../providers/registry.js";
import { HttpError } from "../middleware/error.js";
import {
  type EmailType,
  type FindEmailResult,
  type HintsByUrl,
  type LeadIdentifier,
  type NameQuery,
  type NormalizedEmail,
  leadKey,
  normalizeLinkedinUrl,
} from "@scoop/types";

export interface FindEmailOptions {
  /**
   * URL-mode queries. Either this OR `name_queries` (or both) must be set.
   * Optional now that name-mode is supported; callers that pass neither
   * get a 400 from the entry point validation.
   */
  linkedin_urls?: string[];
  /**
   * Name-mode queries. `full_name` is required; at least one of
   * `company_domain` / `company_name` must be set per query.
   */
  name_queries?: NameQuery[];
  providers?: ProviderName[];
  waterfall: boolean;
  email_types: EmailType[];
  verify: boolean;
  hints?: HintsByUrl;
  request_id?: string;
  tenant_id?: string;
}

const hasRequestedTypes = (
  emails: NormalizedEmail[],
  emailTypes: EmailType[],
): boolean => {
  for (const t of emailTypes) {
    if (emails.some((e) => e.type === t)) return true;
  }
  return false;
};

/**
 * Pick the waterfall chain based on input mode. URL-mode → the historical
 * chain (Aleads first, etc.). Name-mode → Apollo-first because its
 * `/people/match` is the most accurate on name+org. Mixed inputs are rare
 * in practice (entry points enforce one mode per call) but if they do
 * occur we fall back to the URL chain since URL is the more conservative
 * default.
 */
const pickChain = (leads: LeadIdentifier[]): ProviderName[] => {
  const allName = leads.length > 0 && leads.every((l) => l.kind === "name");
  return allName ? NAME_MODE_FINDER_CHAIN : DEFAULT_FINDER_CHAIN;
};

const resolveProviderChain = (
  requested: ProviderName[] | undefined,
  leads: LeadIdentifier[],
): ProviderName[] => {
  const candidates = requested ?? pickChain(leads);
  const available = candidates.filter((p) => {
    if (!finders[p]) return false;
    if (!isProviderConfigured(p)) {
      logger.warn({ provider: p }, "skipping provider — not configured");
      return false;
    }
    return true;
  });
  if (available.length === 0) {
    throw new HttpError(400, "no_configured_providers", { requested: candidates });
  }
  return available;
};

const verifyEmails = async (
  emails: NormalizedEmail[],
  requestId: string | undefined,
): Promise<{ emails: NormalizedEmail[]; credits: number }> => {
  const verifier = verifiers[DEFAULT_VERIFIER];
  if (!verifier || !isProviderConfigured(DEFAULT_VERIFIER)) {
    return { emails, credits: 0 };
  }
  let credits = 0;
  const out: NormalizedEmail[] = [];
  for (const e of emails) {
    if (e.verified) {
      out.push(e);
      continue;
    }
    try {
      const v = await verifier.verifyEmail(e.address);
      credits += v.credits_used;
      logCredit({
        provider: DEFAULT_VERIFIER,
        action: "verify",
        amount: v.credits_used,
        request_id: requestId,
      });
      out.push({
        ...e,
        verified: v.valid,
        verification_status: v.status,
        score: v.score,
        verified_by: DEFAULT_VERIFIER,
      } as NormalizedEmail);
    } catch (err) {
      logger.warn({ err, email: e.address }, "verifier failed");
      out.push(e);
    }
  }
  return { emails: out, credits };
};

/**
 * Build the canonical `LeadIdentifier[]` from the two input shapes. We keep
 * `linkedin_urls` + `name_queries` separate at the public boundary because
 * the402, REST, and MCP all have them as distinct fields — converting once
 * here lets every internal codepath work with a single representation.
 *
 * URLs are normalised here so the rest of the system (Map keying, provider
 * inputs, persistence) only ever sees the canonical `https://linkedin.com/…`
 * form. That dedupes leads across protocol/www/casing variations.
 */
const buildLeads = (opts: FindEmailOptions): LeadIdentifier[] => {
  const urls = opts.linkedin_urls ?? [];
  const names = opts.name_queries ?? [];
  const leads: LeadIdentifier[] = [];
  for (const url of urls) {
    leads.push({ kind: "linkedin", linkedin_url: normalizeLinkedinUrl(url) });
  }
  for (const q of names) leads.push({ ...q, kind: "name" });
  return leads;
};

export const findEmails = async (
  opts: FindEmailOptions,
): Promise<FindEmailResult[]> => {
  const leads = buildLeads(opts);
  if (leads.length === 0) {
    throw new HttpError(400, "no_leads", {
      hint: "provide linkedin_urls or name_queries",
    });
  }

  const chain = resolveProviderChain(opts.providers, leads);

  // Initialise one result row per lead, keyed by the stable lead-key.
  // Insertion order matches input order so we can return in that order at
  // the end (callers — REST, MCP — rely on positional alignment).
  const orderedKeys = leads.map(leadKey);
  const initial: Map<string, FindEmailResult> = new Map(
    leads.map((lead) => [
      leadKey(lead),
      {
        // For URL leads we know the URL up front. For name leads it stays
        // empty until a provider returns one — see PerUrlFinderResult.linkedin_url.
        linkedin_url: lead.kind === "linkedin" ? lead.linkedin_url : "",
        emails: [],
        providers_attempted: [],
        credits_used: 0,
      },
    ]),
  );

  for (const providerName of chain) {
    const provider = finders[providerName]!;
    // Decide which leads still need work this round. In waterfall mode, skip
    // any lead that already has every requested email type.
    const remainingLeads = opts.waterfall
      ? leads.filter((lead) => {
          const r = initial.get(leadKey(lead))!;
          return !hasRequestedTypes(r.emails, opts.email_types);
        })
      : leads;

    if (remainingLeads.length === 0) break;

    let output: Awaited<ReturnType<typeof provider.findEmails>>;
    try {
      output = await provider.findEmails({
        leads: remainingLeads,
        email_types: opts.email_types,
        hints: opts.hints,
      });
    } catch (err) {
      logger.warn({ err, provider: providerName }, "provider failed");
      for (const lead of remainingLeads) {
        const r = initial.get(leadKey(lead))!;
        r.providers_attempted.push({
          provider: providerName,
          found: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    logCredit({
      provider: providerName,
      action: "find",
      amount: output.credits_used,
      request_id: opts.request_id,
      tenant: opts.tenant_id,
      meta: { leads: remainingLeads.length },
    });

    for (const perLead of output.results) {
      // Providers index their results by the same `lead_key` we sent — see
      // PerUrlFinderResult. If a stub or buggy provider returns a key we
      // don't recognise, skip it rather than crash.
      const r = initial.get(perLead.lead_key);
      if (!r) {
        logger.warn(
          { provider: providerName, key: perLead.lead_key },
          "provider returned unknown lead_key",
        );
        continue;
      }
      r.credits_used += output.credits_used / output.results.length || 0;
      r.providers_attempted.push({
        provider: providerName,
        found: perLead.emails.length > 0,
        error: null,
      });
      // Waterfall mode: only add emails for types we don't yet have.
      const existingTypes = new Set(r.emails.map((e) => e.type));
      const filtered = opts.waterfall
        ? perLead.emails.filter((e) => !existingTypes.has(e.type))
        : perLead.emails;
      r.emails.push(...filtered);
      r.person = r.person ?? perLead.person;
      r.company = r.company ?? perLead.company;
      // Fill in linkedin_url from the provider if we didn't have one (name
      // mode). Once set, don't overwrite — first provider to know wins.
      // Normalise on the way in: providers return URLs in various shapes
      // (http://, www., trailing /, country subdomains) and we want a
      // single canonical form across the contacts table + leads view.
      if (!r.linkedin_url && perLead.linkedin_url) {
        r.linkedin_url = normalizeLinkedinUrl(perLead.linkedin_url);
      }
    }
  }

  // Round apportioned credits to integers.
  for (const r of initial.values()) {
    r.credits_used = Math.round(r.credits_used);
  }

  if (opts.verify) {
    for (const r of initial.values()) {
      const { emails, credits } = await verifyEmails(r.emails, opts.request_id);
      r.emails = emails;
      r.credits_used += credits;
    }
  }

  return orderedKeys.map((k) => initial.get(k)!);
};

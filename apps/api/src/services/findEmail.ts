import type { ProviderName } from "../config.js";
import { isProviderConfigured } from "../config.js";
import { logCredit } from "../credits.js";
import { logger } from "../logger.js";
import {
  DEFAULT_FINDER_CHAIN,
  DEFAULT_VERIFIER,
  finders,
  verifiers,
} from "../providers/registry.js";
import { HttpError } from "../middleware/error.js";
import type {
  EmailType,
  FindEmailResult,
  HintsByUrl,
  NormalizedEmail,
  ProviderAttempt,
} from "@scoop/types";

export interface FindEmailOptions {
  linkedin_urls: string[];
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

const resolveProviderChain = (
  requested: ProviderName[] | undefined,
  waterfall: boolean,
): ProviderName[] => {
  const candidates = requested ?? DEFAULT_FINDER_CHAIN;
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
  // When waterfall is false and multiple providers requested, we still try them
  // all and merge — waterfall only affects the early-exit behavior.
  return waterfall ? available : available;
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

export const findEmails = async (
  opts: FindEmailOptions,
): Promise<FindEmailResult[]> => {
  const chain = resolveProviderChain(opts.providers, opts.waterfall);

  // Initialize one result per URL.
  const merged: Map<string, FindEmailResult> = new Map(
    opts.linkedin_urls.map((url) => [
      url,
      {
        linkedin_url: url,
        emails: [],
        providers_attempted: [],
        credits_used: 0,
      },
    ]),
  );

  for (const providerName of chain) {
    const provider = finders[providerName]!;
    const remainingUrls = opts.waterfall
      ? Array.from(merged.values())
          .filter((r) => !hasRequestedTypes(r.emails, opts.email_types))
          .map((r) => r.linkedin_url)
      : opts.linkedin_urls;

    if (remainingUrls.length === 0) break;

    let output: Awaited<ReturnType<typeof provider.findEmails>>;
    try {
      output = await provider.findEmails({
        linkedin_urls: remainingUrls,
        email_types: opts.email_types,
        hints: opts.hints,
      });
    } catch (err) {
      logger.warn({ err, provider: providerName }, "provider failed");
      for (const url of remainingUrls) {
        const r = merged.get(url)!;
        const attempt: ProviderAttempt = {
          provider: providerName,
          found: false,
          error: err instanceof Error ? err.message : String(err),
        };
        r.providers_attempted.push(attempt);
      }
      continue;
    }

    logCredit({
      provider: providerName,
      action: "find",
      amount: output.credits_used,
      request_id: opts.request_id,
      tenant: opts.tenant_id,
      meta: { urls: remainingUrls.length },
    });

    for (const perUrl of output.results) {
      const r = merged.get(perUrl.linkedin_url)!;
      r.credits_used += output.credits_used / output.results.length || 0;
      r.providers_attempted.push({
        provider: providerName,
        found: perUrl.emails.length > 0,
        error: null,
      });
      // Merge: only add emails for types we don't yet have if waterfall.
      const existingTypes = new Set(r.emails.map((e) => e.type));
      const filtered = opts.waterfall
        ? perUrl.emails.filter((e) => !existingTypes.has(e.type))
        : perUrl.emails;
      r.emails.push(...filtered);
      r.person = r.person ?? perUrl.person;
      r.company = r.company ?? perUrl.company;
    }
  }

  // Round credits to integers (we apportioned; sum should match real total via logCredit).
  for (const r of merged.values()) {
    r.credits_used = Math.round(r.credits_used);
  }

  if (opts.verify) {
    for (const r of merged.values()) {
      const { emails, credits } = await verifyEmails(r.emails, opts.request_id);
      r.emails = emails;
      r.credits_used += credits;
    }
  }

  return opts.linkedin_urls.map((u) => merged.get(u)!);
};

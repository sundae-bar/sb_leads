import { request } from "undici";
import { config } from "../config.js";
import type {
  EmailVerifier,
  IntentInput,
  IntentOutput,
  IntentProvider,
  VerifyOutput,
} from "./types.js";
import { ProviderError } from "./types.js";
import type { Company } from "@sundae/types";

const BASE = "https://api.hunter.io/v2";
const MIN_DELAY_MS = 1000 / 15; // 15 req/sec

let lastRequestAt = 0;
const throttle = async (): Promise<void> => {
  const now = Date.now();
  const wait = lastRequestAt + MIN_DELAY_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
};

interface VerifierResponse {
  data?: {
    email?: string;
    status?: string;
    result?: string;
    score?: number;
    mx_records?: boolean;
    smtp_server?: boolean;
    smtp_check?: boolean;
    accept_all?: boolean;
    disposable?: boolean;
    webmail?: boolean;
  };
}

export const hunterioVerifier: EmailVerifier = {
  name: "hunterio",
  async verifyEmail(email: string): Promise<VerifyOutput> {
    await throttle();
    const u = new URL(`${BASE}/email-verifier`);
    u.searchParams.set("email", email);
    u.searchParams.set("api_key", config.providers.hunterio);
    const res = await request(u, { method: "GET" });
    if (res.statusCode >= 400) {
      const text = await res.body.text();
      throw new ProviderError("hunterio", `verify ${res.statusCode}: ${text}`);
    }
    const json = (await res.body.json()) as VerifierResponse;
    const d = json.data ?? {};
    const valid = d.status === "valid" || d.result === "deliverable";
    return {
      email,
      valid,
      status: d.status ?? "unknown",
      score: d.score,
      checks: {
        mx: d.mx_records,
        smtp: d.smtp_check ?? d.smtp_server,
        disposable: d.disposable,
        webmail: d.webmail,
        accept_all: d.accept_all,
      },
      credits_used: 1,
    };
  },
};

interface CompanyFindResponse {
  data?: {
    domain?: string;
    name?: string;
    industry?: string;
    location?: string;
    foundedYear?: number;
    metrics?: { employees?: string; estimatedAnnualRevenue?: string };
    tech?: string[];
    linkedin?: { handle?: string };
  };
}

export const hunterioIntent: IntentProvider = {
  name: "hunterio",
  async getCompanyIntent(input: IntentInput): Promise<IntentOutput> {
    if (!input.company_domain) {
      return { company: {}, signals: [], credits_used: 0 };
    }
    await throttle();
    const u = new URL(`${BASE}/companies/find`);
    u.searchParams.set("domain", input.company_domain);
    u.searchParams.set("api_key", config.providers.hunterio);
    u.searchParams.set("clearbit_format", "true");
    const res = await request(u, { method: "GET" });
    if (res.statusCode >= 400) {
      const text = await res.body.text();
      throw new ProviderError("hunterio", `companies/find ${res.statusCode}: ${text}`);
    }
    const json = (await res.body.json()) as CompanyFindResponse;
    const d = json.data ?? {};
    const company: Company = {
      name: d.name,
      domain: d.domain,
      industry: d.industry,
      linkedin_url: d.linkedin?.handle,
    };
    const signals: IntentOutput["signals"] = [];
    if (d.foundedYear) {
      signals.push({
        type: "founded_year",
        value: d.foundedYear,
        source_provider: "hunterio",
      });
    }
    if (d.metrics?.employees) {
      signals.push({
        type: "employees",
        value: d.metrics.employees,
        source_provider: "hunterio",
      });
    }
    if (d.metrics?.estimatedAnnualRevenue) {
      signals.push({
        type: "estimated_revenue",
        value: d.metrics.estimatedAnnualRevenue,
        source_provider: "hunterio",
      });
    }
    return { company, signals, credits_used: 1 };
  },
};

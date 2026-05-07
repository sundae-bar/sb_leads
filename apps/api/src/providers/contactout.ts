import { request } from "undici";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type {
  EmailFinder,
  FindEmailsInput,
  FindEmailsOutput,
  PerUrlFinderResult,
} from "./types.js";
import { ProviderError } from "./types.js";
import type { NormalizedEmail } from "@sundae/types";

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

const fetchSingle = async (url: string): Promise<ContactoutSingleProfile | undefined> => {
  const u = new URL(`${BASE}/people/linkedin`);
  u.searchParams.set("profile", url);
  u.searchParams.set("include_phone", "false");
  const res = await request(u, { method: "GET", headers: headers() });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new ProviderError("contactout", `single ${res.statusCode}: ${text}`);
  }
  const json = (await res.body.json()) as { profile?: ContactoutSingleProfile };
  return json.profile;
};

const profileToResult = (
  url: string,
  p: ContactoutSingleProfile | undefined,
  emailTypes: ReadonlyArray<"work" | "personal">,
): PerUrlFinderResult => {
  if (!p) return { linkedin_url: url, emails: [] };
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
    linkedin_url: url,
    emails,
    person: {
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.full_name,
      title: p.title,
      location: p.location,
      linkedin_url: p.url ?? url,
    },
    company: p.company,
  };
};

export const contactoutFinder: EmailFinder = {
  name: "contactout",
  async findEmails(input: FindEmailsInput): Promise<FindEmailsOutput> {
    const urls = input.linkedin_urls;
    const profiles = await Promise.all(
      urls.map(async (u) => {
        try {
          return await fetchSingle(u);
        } catch (err) {
          logger.warn({ err, url: u }, "contactout fetch failed");
          return undefined;
        }
      }),
    );
    const results = urls.map((u, i) => profileToResult(u, profiles[i], input.email_types));
    return { results, credits_used: urls.length };
  },
};

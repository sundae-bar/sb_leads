import type { ProviderName } from "../config.js";
import { aleadsFinder, aleadsIntent } from "./aleads.js";
import { apolloFinder, apolloIntent } from "./apollo.js";
import { contactoutFinder } from "./contactout.js";
import { hunterioIntent, hunterioVerifier } from "./hunterio.js";
import { nymeriaFinder } from "./nymeria.js";
import type { EmailFinder, EmailVerifier, IntentProvider } from "./types.js";

export const finders: Partial<Record<ProviderName, EmailFinder>> = {
  aleads: aleadsFinder,
  apollo: apolloFinder,
  nymeria: nymeriaFinder,
  contactout: contactoutFinder,
};

export const verifiers: Partial<Record<ProviderName, EmailVerifier>> = {
  hunterio: hunterioVerifier,
};

export const intentProviders: Partial<Record<ProviderName, IntentProvider>> = {
  apollo: apolloIntent,
  aleads: aleadsIntent,
  hunterio: hunterioIntent,
};

export const DEFAULT_FINDER_CHAIN: ProviderName[] = [
  "aleads",
  "apollo",
  "nymeria",
  "contactout",
];

export const DEFAULT_VERIFIER: ProviderName = "hunterio";

export const DEFAULT_INTENT_CHAIN: ProviderName[] = ["apollo", "aleads"];

export const ALL_PROVIDER_NAMES: ProviderName[] = [
  "aleads",
  "apollo",
  "nymeria",
  "contactout",
  "hunterio",
];

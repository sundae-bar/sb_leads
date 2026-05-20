import type { ProviderName } from '../config.js';
import { aleadsFinder, aleadsIntent } from './aleads.js';
import { apolloFinder, apolloIntent } from './apollo.js';
import { contactoutFinder } from './contactout.js';
import { hunterioIntent, hunterioVerifier } from './hunterio.js';
import { nymeriaFinder } from './nymeria.js';
// Stub providers — see each file's header for what's still to wire. They're
// registered so the ProviderName union stays exhaustive across maps, but
// throw not_implemented at runtime (and are filtered out by
// `isProviderConfigured` unless their env var is set).
import { lushaFinder, lushaIntent, lushaVerifier } from './lusha.js';
import {
  peopledatalabsFinder,
  peopledatalabsIntent,
  peopledatalabsVerifier,
} from './peopledatalabs.js';
import { rocketreachFinder, rocketreachIntent, rocketreachVerifier } from './rocketreach.js';
import { snovFinder, snovIntent, snovVerifier } from './snov.js';
import { zoominfoFinder, zoominfoIntent, zoominfoVerifier } from './zoominfo.js';
import type { EmailFinder, EmailVerifier, IntentProvider } from './types.js';

export const finders: Partial<Record<ProviderName, EmailFinder>> = {
  aleads: aleadsFinder,
  apollo: apolloFinder,
  nymeria: nymeriaFinder,
  contactout: contactoutFinder,
  // Stubs — never invoked under defaults; opt-in only.
  peopledatalabs: peopledatalabsFinder,
  snov: snovFinder,
  lusha: lushaFinder,
  rocketreach: rocketreachFinder,
  zoominfo: zoominfoFinder,
};

export const verifiers: Partial<Record<ProviderName, EmailVerifier>> = {
  hunterio: hunterioVerifier,
  // Stubs.
  peopledatalabs: peopledatalabsVerifier,
  snov: snovVerifier,
  lusha: lushaVerifier,
  rocketreach: rocketreachVerifier,
  zoominfo: zoominfoVerifier,
};

export const intentProviders: Partial<Record<ProviderName, IntentProvider>> = {
  apollo: apolloIntent,
  aleads: aleadsIntent,
  hunterio: hunterioIntent,
  // Stubs.
  peopledatalabs: peopledatalabsIntent,
  snov: snovIntent,
  lusha: lushaIntent,
  rocketreach: rocketreachIntent,
  zoominfo: zoominfoIntent,
};

/**
 * Chain used when the caller hands us LinkedIn URLs. Aleads first because
 * its hit rate on LinkedIn-URL lookups is the highest in our usage.
 */
export const DEFAULT_FINDER_CHAIN: ProviderName[] = [
  'aleads',
  'apollo',
  'nymeria',
  'contactout',
];

/**
 * Chain used when the caller hands us name+domain queries (no LinkedIn URL).
 * Apollo's `/people/match` is most accurate on name+org in our experience,
 * so it leads. ContactOut and Nymeria fall through; Aleads' name path is
 * the rewritten advanced-search flow (lower precision than its URL path).
 */
export const NAME_MODE_FINDER_CHAIN: ProviderName[] = [
  'apollo',
  'contactout',
  'nymeria',
  'aleads',
];

export const DEFAULT_VERIFIER: ProviderName = 'hunterio';

export const DEFAULT_INTENT_CHAIN: ProviderName[] = ['apollo', 'aleads'];

export const ALL_PROVIDER_NAMES: ProviderName[] = [
  'aleads',
  'apollo',
  'nymeria',
  'contactout',
  'hunterio',
  'peopledatalabs',
  'snov',
  'lusha',
  'rocketreach',
  'zoominfo',
];

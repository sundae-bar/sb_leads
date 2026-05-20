import type { ProviderName } from '../config.js';

/**
 * Per-provider, per-action tenant credit cost.
 *
 * Single source of truth for "how many of the tenant's internal credits does
 * one invocation of this provider's action cost?". Lets us tune economics
 * from one file instead of hunting `urls.length` and magic `1`s across the
 * provider implementations.
 *
 * All values = 1 in v1. Once we have real usage data we'll diverge:
 *   - Cheap providers (Aleads search): may drop to 0 or stay 1.
 *   - Heavyweight providers (ZoomInfo full enrich): could be 2-5.
 *   - Verify ops are usually a fraction of find ops.
 *
 * Stubs are included so the record stays exhaustive over `ProviderName`;
 * their values are moot until the provider is implemented.
 */
export const PROVIDER_CREDITS: Record<
  ProviderName,
  {
    /** Cost per lead resolved (multiplied by leads.length in providers). */
    find: number;
    /** Cost per email verification call. */
    verify: number;
    /** Cost per intent-signal lookup. */
    intent: number;
    /**
     * Cost per upstream search call (e.g. Aleads' advanced-search step,
     * separate from the find-email unlock). For providers that don't have
     * a search step, this is unused.
     */
    search: number;
  }
> = {
  aleads: { find: 1, verify: 1, intent: 1, search: 1 },
  apollo: { find: 1, verify: 1, intent: 1, search: 1 },
  nymeria: { find: 1, verify: 1, intent: 1, search: 1 },
  contactout: { find: 1, verify: 1, intent: 1, search: 1 },
  hunterio: { find: 1, verify: 1, intent: 1, search: 1 },
  // Stubs (see peopledatalabs.ts, snov.ts, etc. — all throw not_implemented).
  peopledatalabs: { find: 1, verify: 1, intent: 1, search: 1 },
  snov: { find: 1, verify: 1, intent: 1, search: 1 },
  lusha: { find: 1, verify: 1, intent: 1, search: 1 },
  rocketreach: { find: 1, verify: 1, intent: 1, search: 1 },
  zoominfo: { find: 1, verify: 1, intent: 1, search: 1 },
};

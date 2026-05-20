import 'dotenv/config';

export const config = {
  // Prefer PORT (Railway / most PaaS auto-injects it); fall back to API_PORT
  // for local dev, then 4000.
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  providers: {
    // Real providers — wired up and used by the default waterfall.
    aleads: process.env.ALEADS_API_KEY ?? '',
    apollo: process.env.APOLLO_API_KEY ?? '',
    nymeria: process.env.NYMERIA_API_KEY ?? '',
    contactout: process.env.CONTACTOUT_API_KEY ?? '',
    hunterio: process.env.HUNTERIO_API_KEY ?? '',
    // Stub providers — backing modules exist for type-completeness +
    // marketing-cloud parity, but throw "not implemented yet" at runtime.
    // Empty default key → isProviderConfigured returns false → never in the
    // default chain. Set the env var to enable (once implemented).
    peopledatalabs: process.env.PEOPLEDATALABS_API_KEY ?? '',
    snov: process.env.SNOV_API_KEY ?? '',
    lusha: process.env.LUSHA_API_KEY ?? '',
    rocketreach: process.env.ROCKETREACH_API_KEY ?? '',
    zoominfo: process.env.ZOOMINFO_API_KEY ?? '',
  },
} as const;

export type ProviderName = keyof typeof config.providers;

export const isProviderConfigured = (name: ProviderName): boolean =>
  config.providers[name].length > 0;

import 'dotenv/config';

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  providers: {
    aleads: process.env.ALEADS_API_KEY ?? '',
    apollo: process.env.APOLLO_API_KEY ?? '',
    nymeria: process.env.NYMERIA_API_KEY ?? '',
    contactout: process.env.CONTACTOUT_API_KEY ?? '',
    hunterio: process.env.HUNTERIO_API_KEY ?? '',
  },
} as const;

export type ProviderName = keyof typeof config.providers;

export const isProviderConfigured = (name: ProviderName): boolean =>
  config.providers[name].length > 0;

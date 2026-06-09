import 'dotenv/config';

export const config = {
  // Prefer PORT (Railway / most PaaS auto-injects it); fall back to API_PORT
  // for local dev, then 4000.
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  // Number of reverse-proxy hops in front of the API (Railway edge = 1; set 2
  // if a Cloudflare-proxied custom domain fronts it). Drives Express
  // `trust proxy`, which decides req.ip for rate limiting — see index.ts.
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  x402: {
    // Deadline for the provider fan-out on the paid /x402/find-email path. On
    // expiry the handler returns 504 → the payment middleware cancels (the
    // buyer is NOT charged) rather than the request hanging until it slowly
    // succeeds and settles after the client has already timed out. Keep this
    // below the client/proxy idle timeout.
    findEmailTimeoutMs: Number(process.env.X402_FIND_EMAIL_TIMEOUT_MS ?? 20_000),
  },
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

// Shared web constants.

/** Base URL of the Express API (the `/api/v1` backend). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Public base URL of this web app — used to build Stripe redirect URLs.
 * Dev fallback matches the dev port in apps/web/package.json (3004).
 */
export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3004';

// ─── Time spans (milliseconds) ───────────────────────────────────────────────
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Poll Coinbase Bazaar + agentic.market until Scoop appears.
//
// Usage:
//   pnpm --filter @scoop/api discovery:poll              # loop, page-1 only (fast)
//   pnpm --filter @scoop/api discovery:poll once         # single check
//   pnpm --filter @scoop/api discovery:poll once --full  # walk every page (~30s, slow but exhaustive)
//
// Bazaar is the source (Coinbase's discovery feed). agentic.market is a UI
// that republishes from Bazaar. Bazaar uses offset-based pagination on the
// list endpoint (NOT cursor-based — that's the search endpoint) and the
// `payTo` filter is currently silently ignored, so the only reliable check
// is to walk pages until we find our resource or exhaust the feed.
//
// Note: Bazaar's listing is cached for up to 10 minutes (per docs). Newly
// indexed resources won't show up immediately even after a successful settle.
import 'dotenv/config';
import { createAuthHeader } from '@coinbase/x402';

const SCOOP_NEEDLE = 'scoop-api-production';
const BAZAAR_HOST = 'https://api.cdp.coinbase.com';
const BAZAAR_PATH = '/platform/v2/x402/discovery/resources';
const AGENTIC_URL = 'https://api.agentic.market/v1/services/search?q=scoop';

const ONCE = process.argv.includes('once');
const FULL = process.argv.includes('--full');
const INTERVAL_MS = 60_000;
const PAGE_LIMIT = 500;
const PAGE_LIMIT_QUICK = 200; // page-1-only mode

interface BazaarResource {
  resource: string;
  type?: string;
  x402Version?: number;
  lastUpdated?: string;
  accepts?: unknown;
  extensions?: Record<string, unknown>;
}

interface BazaarPage {
  items?: BazaarResource[];
  pagination?: { limit: number; offset: number; total: number };
}

async function bazaarPage(offset: number, limit: number): Promise<BazaarPage | null> {
  const id = process.env.CDP_API_KEY_ID;
  const secret = process.env.CDP_API_KEY_SECRET;
  if (!id || !secret) return null;

  const qs = `?limit=${limit}&offset=${offset}`;
  const fullPath = BAZAAR_PATH + qs;
  const authHeader = await createAuthHeader(
    id,
    secret,
    'GET',
    BAZAAR_HOST.replace('https://', ''),
    fullPath,
  );

  const res = await fetch(BAZAAR_HOST + fullPath, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) {
    console.error(`  [bazaar] HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  return (await res.json()) as BazaarPage;
}

async function checkBazaar(full: boolean): Promise<{
  found: boolean;
  scanned: number;
  total: number;
  entry?: BazaarResource;
}> {
  if (!full) {
    // Fast path: just scan page 1 with limit=200. Catches our resource if
    // the feed happens to surface it near the top (lastUpdated ordering?
    // unclear; doc doesn't promise). Cheap and good enough for a live loop.
    const page = await bazaarPage(0, PAGE_LIMIT_QUICK);
    if (!page) return { found: false, scanned: 0, total: 0 };
    const items = page.items ?? [];
    const total = page.pagination?.total ?? 0;
    const entry = items.find((r) => r.resource?.includes(SCOOP_NEEDLE));
    return { found: !!entry, scanned: items.length, total, entry };
  }

  // Thorough path: walk every page. ~30s for 48k resources at limit=500.
  let offset = 0;
  let total = 0;
  let scanned = 0;
  let entry: BazaarResource | undefined;
  while (true) {
    const page = await bazaarPage(offset, PAGE_LIMIT);
    if (!page) break;
    const items = page.items ?? [];
    total = page.pagination?.total ?? 0;
    scanned += items.length;
    const hit = items.find((r) => r.resource?.includes(SCOOP_NEEDLE));
    if (hit) {
      entry = hit;
      break;
    }
    if (items.length === 0 || scanned >= total) break;
    offset += items.length;
    if (offset > 200_000) break; // sanity
  }
  return { found: !!entry, scanned, total, entry };
}

async function checkAgentic(): Promise<{
  found: boolean;
  total: number;
  entry?: unknown;
}> {
  const res = await fetch(AGENTIC_URL);
  if (!res.ok) return { found: false, total: 0 };
  const body = (await res.json()) as { services?: unknown[]; total?: number };
  const services = body.services ?? [];
  return { found: services.length > 0, total: body.total ?? services.length, entry: services[0] };
}

async function tick(full: boolean): Promise<boolean> {
  const ts = new Date().toISOString();
  const [bazaar, agentic] = await Promise.all([
    checkBazaar(full).catch((e) => ({
      found: false,
      scanned: 0,
      total: 0,
      error: e.message,
    })),
    checkAgentic().catch((e) => ({ found: false, total: 0, error: e.message })),
  ]);
  const bazaarStatus = bazaar.found
    ? '✓ FOUND'
    : `× (${bazaar.scanned}/${bazaar.total} scanned)`;
  const agenticStatus = agentic.found
    ? '✓ FOUND'
    : `× (${agentic.total} matches)`;
  console.log(`${ts}  Bazaar: ${bazaarStatus}  Agentic: ${agenticStatus}`);
  if ('entry' in bazaar && bazaar.entry) {
    console.log('   Bazaar entry:', JSON.stringify(bazaar.entry, null, 2));
  }
  if ('entry' in agentic && agentic.entry) {
    console.log('   Agentic entry:', JSON.stringify(agentic.entry, null, 2));
  }
  return bazaar.found && agentic.found;
}

async function main() {
  if (ONCE) {
    await tick(FULL);
    return;
  }
  console.log(
    `Polling every ${INTERVAL_MS / 1000}s (page-1 only — pass --full for exhaustive scan). Ctrl-C to stop.`,
  );
  while (true) {
    const done = await tick(false);
    if (done) {
      console.log('\n🎉 Listed on both Bazaar and agentic.market — done.');
      return;
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

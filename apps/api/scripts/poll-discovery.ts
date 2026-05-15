// Poll Coinbase Bazaar + agentic.market until Scoop appears.
//
// Usage:
//   pnpm --filter @scoop/api discovery:poll
//   pnpm --filter @scoop/api discovery:poll once   # single check, no loop
//
// Bazaar is the source (Coinbase's discovery feed). agentic.market is a UI
// that republishes from Bazaar. Bazaar usually picks us up within minutes
// once X402_DISCOVERABLE=true; agentic.market then takes up to ~24h.
import 'dotenv/config';
import { createAuthHeader } from '@coinbase/x402';

const SCOOP_URL = 'https://scoop-api-production.up.railway.app/x402/find-email';
const BAZAAR_HOST = 'https://api.cdp.coinbase.com';
const BAZAAR_PATH = '/platform/v2/x402/discovery/resources';
const AGENTIC_URL = 'https://api.agentic.market/v1/services/search?q=scoop';

const ONCE = process.argv.includes('once');
const INTERVAL_MS = 60_000;

interface BazaarResource {
  resource: string;
  type?: string;
  x402Version?: number;
  metadata?: { name?: string; description?: string; discoverable?: boolean };
}

async function checkBazaar(): Promise<{ found: boolean; total: number; entry?: BazaarResource }> {
  const id = process.env.CDP_API_KEY_ID;
  const secret = process.env.CDP_API_KEY_SECRET;
  if (!id || !secret) {
    return { found: false, total: 0 };
  }

  const url = `${BAZAAR_HOST}${BAZAAR_PATH}`;
  const authHeader = await createAuthHeader(id, secret, 'GET', BAZAAR_HOST.replace('https://', ''), BAZAAR_PATH);

  const res = await fetch(url, { headers: { Authorization: authHeader } });
  if (!res.ok) {
    console.error(`  [bazaar] HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    return { found: false, total: 0 };
  }
  const body = (await res.json()) as { items?: BazaarResource[] };
  const items = body.items ?? [];
  const entry = items.find((r) => r.resource === SCOOP_URL || r.resource?.includes('scoop-api-production'));
  return { found: !!entry, total: items.length, entry };
}

async function checkAgentic(): Promise<{ found: boolean; total: number; entry?: unknown }> {
  const res = await fetch(AGENTIC_URL);
  if (!res.ok) return { found: false, total: 0 };
  const body = (await res.json()) as { services?: unknown[]; total?: number };
  const services = body.services ?? [];
  return { found: services.length > 0, total: body.total ?? services.length, entry: services[0] };
}

async function tick() {
  const ts = new Date().toISOString();
  const [bazaar, agentic] = await Promise.all([
    checkBazaar().catch((e) => ({ found: false, total: 0, error: e.message })),
    checkAgentic().catch((e) => ({ found: false, total: 0, error: e.message })),
  ]);
  console.log(
    `${ts}  Bazaar: ${bazaar.found ? '✓ FOUND' : `× (${bazaar.total} resources scanned)`}  ` +
      `Agentic: ${agentic.found ? '✓ FOUND' : `× (${agentic.total} matches)`}`,
  );
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
    await tick();
    return;
  }
  console.log(`Polling every ${INTERVAL_MS / 1000}s. Ctrl-C to stop.`);
  while (true) {
    const done = await tick();
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

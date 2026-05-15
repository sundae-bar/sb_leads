// Publishes our LISTED_SERVICES manifest to the402.ai.
//
// the402's provider API exposes POST/PUT/DELETE on /v1/services but NOT a
// GET listing — so we just attempt to POST each service and treat
// "duplicate" errors as already-listed (idempotent).
//
// To update or delete an existing service, use the the402 dashboard or extend
// this script with the service id (saved on first create).
//
// Run with: pnpm --filter @scoop/api the402:sync
import 'dotenv/config';
import { LISTED_SERVICES, type The402Service } from '../src/integrations/the402/services.js';

const API_URL = process.env.THE402_API_URL ?? 'https://api.the402.ai';
const API_KEY = process.env.THE402_API_KEY;

if (!API_KEY) {
  console.error('THE402_API_KEY is required. Register on the402.ai and add it to .env.');
  process.exit(1);
}

interface PostResponse {
  id?: string;
  error?: string;
  [key: string]: unknown;
}

async function createService(svc: The402Service): Promise<void> {
  const res = await fetch(`${API_URL}/v1/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY!,
    },
    body: JSON.stringify(svc),
  });

  const body = (await res.json().catch(() => ({}))) as PostResponse;

  if (res.ok) {
    console.log(`  ✓ created ${svc.name}${body.id ? ` (${body.id})` : ''}`);
    return;
  }

  const message = (body.error ?? `${res.status}`).toString().toLowerCase();

  // Duplicate-name → no-op.
  if (
    res.status === 409 ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('unique')
  ) {
    console.log(
      `  ↺ ${svc.name} already exists — skipping (edit via dashboard or PUT /v1/services/:id)`,
    );
    return;
  }

  // The402 requires a webhook URL on the *participant* (provider) before it
  // will accept a data_api service. This is a one-time dashboard step.
  if (message.includes('webhook url required')) {
    console.error(
      `\n  ✗ ${svc.name}: ${body.error ?? message}\n\n` +
        `    Set your provider webhook URL first:\n` +
        `      1. Run \`ngrok http 4004\` (or expose your API another way)\n` +
        `      2. Go to https://the402.ai/dashboard → Settings → Webhook URL\n` +
        `      3. Paste \`<ngrok-host>/the402/webhook\`\n` +
        `      4. Re-run this script\n`,
    );
    throw new Error('participant_webhook_url_missing');
  }

  console.error(`  ✗ failed to create ${svc.name}: ${res.status} ${JSON.stringify(body)}`);
  throw new Error(`POST /v1/services → ${res.status}`);
}

async function main() {
  console.log(`Syncing ${LISTED_SERVICES.length} service(s) to ${API_URL}…`);

  for (const svc of LISTED_SERVICES) {
    await createService(svc);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

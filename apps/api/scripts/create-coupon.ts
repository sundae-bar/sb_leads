// Admin CLI for adding a coupon code. No UI yet — coupons are minted by
// hand by an operator with adminDb access.
//
// Usage:
//   pnpm --filter @scoop/api create-coupon <CODE> <AMOUNT> [options]
//
// Examples:
//   pnpm --filter @scoop/api create-coupon WELCOME50 50
//   pnpm --filter @scoop/api create-coupon LAUNCH200 200 --max-redemptions=100
//   pnpm --filter @scoop/api create-coupon HOLIDAY 500 --expires=2026-12-31 --description="Holiday promo"
//
// Options:
//   --description="..."     Free-text label, shown in ledger entries
//   --max-redemptions=N     Cap total uses globally (omit = unlimited)
//   --expires=YYYY-MM-DD    Disable after this date (omit = never)
//   --disabled              Create disabled (default is enabled)
import 'dotenv/config';
import { adminDb } from '../src/db/admin.js';

interface Opts {
  description?: string;
  maxRedemptions?: number;
  expiresAt?: string;
  enabled: boolean;
}

function parseArgs(argv: string[]): { code: string; amount: number; opts: Opts } {
  if (argv.length < 2) {
    console.error('Usage: pnpm --filter @scoop/api create-coupon <CODE> <AMOUNT> [options]');
    console.error('       see file header for options.');
    process.exit(2);
  }
  const [code, amountStr, ...rest] = argv;
  const amount = parseInt(amountStr, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    console.error(`AMOUNT must be a positive integer (got: ${amountStr})`);
    process.exit(2);
  }
  const opts: Opts = { enabled: true };
  for (const arg of rest) {
    if (arg === '--disabled') {
      opts.enabled = false;
      continue;
    }
    const m = /^--([a-z-]+)=(.+)$/i.exec(arg);
    if (!m) {
      console.error(`Unknown arg: ${arg}`);
      process.exit(2);
    }
    const [, key, value] = m;
    switch (key) {
      case 'description':
        opts.description = value;
        break;
      case 'max-redemptions':
        opts.maxRedemptions = parseInt(value, 10);
        if (!Number.isFinite(opts.maxRedemptions) || opts.maxRedemptions <= 0) {
          console.error('--max-redemptions must be a positive integer');
          process.exit(2);
        }
        break;
      case 'expires':
        opts.expiresAt = new Date(value).toISOString();
        if (Number.isNaN(new Date(value).getTime())) {
          console.error('--expires must be a parseable date (YYYY-MM-DD)');
          process.exit(2);
        }
        break;
      default:
        console.error(`Unknown option: --${key}`);
        process.exit(2);
    }
  }
  return { code, amount, opts };
}

async function main() {
  const { code, amount, opts } = parseArgs(process.argv.slice(2));

  const { data, error } = await adminDb
    .from('coupons')
    .insert({
      code,
      amount,
      description: opts.description ?? null,
      max_redemptions: opts.maxRedemptions ?? null,
      expires_at: opts.expiresAt ?? null,
      enabled: opts.enabled,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.error(`Coupon code "${code}" already exists. Pick a different one.`);
    } else {
      console.error('Insert failed:', error.message);
    }
    process.exit(2);
  }

  console.log('\n✅ Coupon created:\n');
  console.log(JSON.stringify(data, null, 2));
  console.log(
    `\nUsers can redeem at /app/settings?tab=billing with code: ${code.toUpperCase()}`,
  );
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});

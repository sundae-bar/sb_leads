// Admin CLI for manually granting / adjusting credits on a tenant. Useful
// for support ops ("we had an outage, here's 500 credits") and for seeding
// test workspaces.
//
// Usage:
//   pnpm --filter @scoop/api grant-credits <TENANT_ID> <AMOUNT> [--description="..."]
//
// Amount can be negative to remove credits (kind=`adjustment` either way).
// A positive amount uses kind=`grant`, negative uses kind=`adjustment`.
//
// Example:
//   pnpm --filter @scoop/api grant-credits 1234abcd-...-... 500 --description="apology credit"
//   pnpm --filter @scoop/api grant-credits 1234abcd-...-... -100 --description="rollback"
import 'dotenv/config';
import { adminDb } from '../src/db/admin.js';

function parseArgs(argv: string[]): { tenantId: string; amount: number; description?: string } {
  if (argv.length < 2) {
    console.error('Usage: pnpm --filter @scoop/api grant-credits <TENANT_ID> <AMOUNT> [--description="..."]');
    process.exit(2);
  }
  const [tenantId, amountStr, ...rest] = argv;
  const amount = parseInt(amountStr, 10);
  if (!Number.isFinite(amount) || amount === 0) {
    console.error('AMOUNT must be a non-zero integer (positive = grant, negative = adjustment)');
    process.exit(2);
  }
  let description: string | undefined;
  for (const arg of rest) {
    const m = /^--description=(.+)$/i.exec(arg);
    if (m) {
      description = m[1];
    } else {
      console.error(`Unknown arg: ${arg}`);
      process.exit(2);
    }
  }
  return { tenantId, amount, description };
}

async function main() {
  const { tenantId, amount, description } = parseArgs(process.argv.slice(2));

  // Verify tenant exists. Cheap sanity check that catches typos before we
  // create an orphan ledger row.
  const { data: tenant } = await adminDb
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle();
  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`);
    process.exit(2);
  }

  const kind = amount > 0 ? 'grant' : 'adjustment';
  const { data, error } = await adminDb
    .from('credit_ledger')
    .insert({
      tenant_id: tenantId,
      amount,
      kind,
      description: description ?? `manual ${kind} by admin script`,
      ref_type: 'admin_script',
      ref_id: 'grant-credits',
    })
    .select()
    .single();

  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(2);
  }

  // Read the new balance so the operator sees the resulting state.
  const { data: bal } = await adminDb
    .from('tenant_credits')
    .select('balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  console.log(`\n✅ ${amount > 0 ? 'Granted' : 'Adjusted'} ${Math.abs(amount).toLocaleString()} credits ` +
    `${amount > 0 ? 'to' : 'from'} workspace "${tenant.name}" (${tenantId}).`);
  console.log(`   New balance: ${(bal?.balance ?? 0).toLocaleString()} credits`);
  console.log(`   Ledger entry id: ${data.id}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: members, error } = await admin
    .from('tenant_members')
    .select('user_id, tenant_id, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to read tenant_members:', error);
    process.exit(1);
  }

  // First membership wins (mirrors auth middleware's existing logic).
  const firstByUser = new Map<string, string>();
  for (const row of members ?? []) {
    if (!firstByUser.has(row.user_id)) {
      firstByUser.set(row.user_id, row.tenant_id);
    }
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, tenantId] of firstByUser) {
    const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !userRes.user) {
      console.warn(`skip ${userId}: ${getErr?.message ?? 'no user'}`);
      failed++;
      continue;
    }

    const existing = (userRes.user.app_metadata as { active_tenant_id?: string } | null)
      ?.active_tenant_id;
    if (existing === tenantId) {
      skipped++;
      continue;
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...userRes.user.app_metadata,
        active_tenant_id: tenantId,
      },
    });

    if (updErr) {
      console.error(`fail ${userId}: ${updErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`backfill done: updated=${updated} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

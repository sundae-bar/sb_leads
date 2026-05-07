import { schedules } from '@trigger.dev/sdk/v3';
import { adminDb } from '../db/admin.js';
import { makeTraceLogger } from '../lib/trace-logger.js';

// Runs nightly at 2 AM UTC — placeholder for real scheduled agents.
// Cron has no user, so it uses adminDb (RLS bypass) and must set tenant_id explicitly.
// Set SYSTEM_TENANT_ID to a valid tenants.id row to record traces; otherwise skip.
export const nightlySummaryTask = schedules.task({
  id: 'nightly-summary',
  cron: '0 2 * * *',
  run: async () => {
    const systemTenantId = process.env.SYSTEM_TENANT_ID;
    if (!systemTenantId) {
      console.warn('[nightly-summary] SYSTEM_TENANT_ID not set; skipping trace logging');
      // TODO: when promoted to a real cron, iterate tenants and run per-tenant work here.
      return;
    }

    const traceLogger = makeTraceLogger(adminDb);
    const run = await traceLogger.startRun({
      agentName: 'nightly-summary',
      triggerType: 'cron',
      tenantId: systemTenantId,
      input: { date: new Date().toISOString() },
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await traceLogger.completeRun(run.id, { output: 'placeholder' });
    } catch (err) {
      await traceLogger.failRun(run.id, err);
      throw err;
    }
  },
});

import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { ProviderName } from '../config.js';
import { getIntentSignals } from '../services/intentSignals.js';
import { intentRequestSchema } from './schemas.js';
import { requireLeadsAuth } from '../middleware/requireLeadsAuth.js';
import { consumeCredits } from '../lib/billing.js';

export const intentSignalsRouter = Router();

intentSignalsRouter.post('/intent-signals', requireLeadsAuth, async (req, res, next) => {
  try {
    const body = intentRequestSchema.parse(req.body);

    const guard = await consumeCredits(req.user.tenantId, 1);
    if (!guard.ok) {
      res.status(402).json({ error: 'out_of_credits' });
      return;
    }

    const result = await getIntentSignals({
      linkedin_url: body.linkedin_url,
      company_domain: body.company_domain,
      company_name: body.company_name,
      providers: body.providers as ProviderName[] | undefined,
      request_id: randomUUID(),
      tenant_id: req.user.tenantId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

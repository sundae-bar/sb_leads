import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { ProviderName } from '../config.js';
import { verifyEmail } from '../services/verifyEmail.js';
import { verifyEmailRequestSchema } from './schemas.js';
import { requireLeadsAuth } from '../middleware/requireLeadsAuth.js';
import { consumeCredits } from '../lib/billing.js';

export const verifyEmailRouter = Router();

verifyEmailRouter.post('/verify-email', requireLeadsAuth, async (req, res, next) => {
  try {
    const body = verifyEmailRequestSchema.parse(req.body);

    const requestId = randomUUID();
    const guard = await consumeCredits(req.user.tenantId, 1, {
      kind: 'debit_verify',
      description: `verify_email ${body.email}`,
      refType: 'verify_email_request',
      refId: requestId,
    });
    if (!guard.ok) {
      res.status(402).json({ error: 'out_of_credits' });
      return;
    }

    const result = await verifyEmail({
      email: body.email,
      provider: body.provider as ProviderName | undefined,
      request_id: requestId,
      tenant_id: req.user.tenantId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

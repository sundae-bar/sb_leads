import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { ProviderName } from '../config.js';
import { findEmails } from '../services/findEmail.js';
import { findEmailRequestSchema } from './schemas.js';
import { requireLeadsAuth } from '../middleware/requireLeadsAuth.js';
import { consumeCredits, refundCredits, getCreditsRemaining } from '../lib/billing.js';

export const findEmailRouter = Router();

findEmailRouter.post('/find-email', requireLeadsAuth, async (req, res, next) => {
  try {
    const body = findEmailRequestSchema.parse(req.body);
    const isBatch = Array.isArray(body.linkedin_urls);
    const urls = body.linkedin_urls ?? (body.linkedin_url ? [body.linkedin_url] : []);
    const providers =
      body.providers ?? (body.provider ? [body.provider] : undefined);

    // The Zod refinement already guarantees exactly one mode is set.
    const isNameMode = !urls.length && Boolean(body.full_name);

    const guard = await consumeCredits(req.user.tenantId, 1);
    if (!guard.ok) {
      res.status(402).json({ error: 'out_of_credits' });
      return;
    }

    // Construct either a URL-mode or name-mode findEmails input. The
    // service layer normalises both into LeadIdentifier[] internally.
    const findInput = isNameMode
      ? {
          name_queries: [
            {
              kind: 'name' as const,
              full_name: body.full_name!,
              first_name: body.first_name,
              last_name: body.last_name,
              company_domain: body.company_domain,
              company_name: body.company_name,
            },
          ],
        }
      : {
          linkedin_urls: urls,
          hints:
            body.hints_by_url ??
            (body.hints
              ? Object.fromEntries(urls.map((u) => [u, body.hints]))
              : undefined),
        };

    const results = await findEmails({
      ...findInput,
      providers: providers as ProviderName[] | undefined,
      waterfall: body.waterfall ?? true,
      email_types: body.email_types ?? ['work', 'personal'],
      verify: body.verify ?? false,
      request_id: randomUUID(),
      tenant_id: req.user.tenantId,
    });

    // Refund the credit when nothing was found.
    const allEmpty = results.every((r) => r.emails.length === 0);
    const creditsRemaining = allEmpty
      ? (await refundCredits(req.user.tenantId, 1)).remaining
      : await getCreditsRemaining(req.user.tenantId);

    if (isBatch) {
      res.json({
        results,
        credits_used: allEmpty ? 0 : results.reduce((acc, r) => acc + r.credits_used, 0),
        credits_remaining: creditsRemaining,
      });
      return;
    }
    res.json({ ...results[0], credits_remaining: creditsRemaining });
  } catch (err) {
    next(err);
  }
});

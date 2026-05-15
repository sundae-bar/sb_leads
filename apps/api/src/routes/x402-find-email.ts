// Route handler for `POST /x402/find-email`.
//
// IMPORTANT: this handler only runs AFTER the x402 payment middleware has
// verified the buyer's USDC payment via the facilitator. The on-chain payment
// IS the billing — we do NOT call consumeCredits here.
//
// Same `findEmails()` service powers the dashboard, the chat MCP tool, the
// the402 webhook, and this endpoint.
import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { findEmails } from '../services/findEmail.js';
import { logger } from '../logger.js';
import type { EmailType } from '@scoop/types';

const bodySchema = z.object({
  linkedin_url: z.string().url(),
  email_types: z.array(z.enum(['work', 'personal'])).optional(),
  verify: z.boolean().optional(),
});

export const x402FindEmailRouter = Router();

x402FindEmailRouter.post('/x402/find-email', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body);
    const requestId = randomUUID();

    const results = await findEmails({
      linkedin_urls: [body.linkedin_url],
      providers: undefined,
      waterfall: true,
      email_types: (body.email_types ?? ['work', 'personal']) as EmailType[],
      verify: body.verify ?? false,
      hints: undefined,
      request_id: requestId,
    });

    const result = results[0];
    const deliverable = {
      linkedin_url: result?.linkedin_url ?? body.linkedin_url,
      emails: result?.emails ?? [],
      person: result?.person ?? null,
      company: result?.company ?? null,
      providers_attempted: result?.providers_attempted ?? [],
    };

    // NOTE: x402 `exact` scheme is all-or-nothing — there's no in-protocol
    // refund mechanism. Buyers pay the full quote regardless of whether
    // findEmails returns hits. Dashboard + the402 paths still refund.
    logger.info(
      {
        request_id: requestId,
        linkedin_url: body.linkedin_url,
        emails_found: deliverable.emails.length,
      },
      'x402 find_email fulfilled',
    );

    res.json(deliverable);
  } catch (err) {
    next(err);
  }
});

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

/**
 * Two input modes (mirrors the MCP tool + REST endpoint):
 *   - URL mode  — pass `linkedin_url`.
 *   - Name mode — pass `full_name` + one of `company_domain` / `company_name`.
 * The refinement below rejects mixed or empty input.
 */
const bodySchema = z
  .object({
    linkedin_url: z.string().url().optional(),
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_domain: z.string().optional(),
    company_name: z.string().optional(),
    email_types: z.array(z.enum(['work', 'personal'])).optional(),
    verify: z.boolean().optional(),
  })
  .refine(
    (v) => {
      const hasUrl = Boolean(v.linkedin_url);
      const hasName = Boolean(v.full_name);
      const hasCompany = Boolean(v.company_domain || v.company_name);
      if (hasUrl && hasName) return false;
      if (hasUrl) return true;
      return hasName && hasCompany;
    },
    {
      message:
        'provide either linkedin_url OR full_name + company_domain/company_name',
    },
  );

export const x402FindEmailRouter = Router();

x402FindEmailRouter.post('/x402/find-email', async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body);
    const requestId = randomUUID();
    const isNameMode = !body.linkedin_url && Boolean(body.full_name);

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
          linkedin_urls: [body.linkedin_url!],
        };

    const results = await findEmails({
      ...findInput,
      providers: undefined,
      waterfall: true,
      email_types: (body.email_types ?? ['work', 'personal']) as EmailType[],
      verify: body.verify ?? false,
      request_id: requestId,
    });

    const result = results[0];
    const deliverable = {
      linkedin_url: result?.linkedin_url ?? body.linkedin_url ?? '',
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

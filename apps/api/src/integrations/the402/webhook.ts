import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { adminDb } from '../../db/admin.js';
import { findEmails } from '../../services/findEmail.js';
import { logger } from '../../logger.js';
import { LISTED_SERVICES } from './services.js';
import { verifyWebhookSignature } from './signature.js';
import { validateCallbackUrl } from './callback-url.js';

/** Body shape per the402.ai's docs (best-effort — verified at parse time). */
interface The402WebhookEvent {
  id: string;
  type: 'job_dispatch' | 'thread_inquiry' | 'quote_request';
  service_id?: string;
  service_name?: string;
  callback_url?: string;
  inputs?: Record<string, unknown>;
}

const API_URL = process.env.THE402_API_URL ?? 'https://api.the402.ai';

async function deliverResult(
  callbackUrl: string,
  deliverable: Record<string, unknown>,
): Promise<void> {
  const apiKey = process.env.THE402_API_KEY;
  if (!apiKey) throw new Error('THE402_API_KEY missing — cannot deliver');
  const res = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ deliverable }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`callback ${callbackUrl} → ${res.status}: ${body}`);
  }
}

/** Express handler. Mounted at POST /the402/webhook; NOT behind requireLeadsAuth. */
export async function handleThe402Webhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.THE402_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('THE402_WEBHOOK_SECRET missing — refusing webhook');
    res.status(500).json({ error: 'misconfigured' });
    return;
  }

  // express.json({ verify }) stashes the raw bytes here. If we ever drop the
  // verify hook, we lose HMAC capability — fail closed.
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    logger.error('the402 webhook missing rawBody — express.json verify hook not wired');
    res.status(500).json({ error: 'misconfigured' });
    return;
  }

  const verify = verifyWebhookSignature({
    rawBody,
    signatureHeader: req.get('x-webhook-signature') ?? undefined,
    timestampHeader: req.get('x-webhook-timestamp') ?? undefined,
    secret,
  });

  if (!verify.ok) {
    logger.warn({ reason: verify.reason }, 'webhook_signature_mismatch');
    res.status(401).json({ error: verify.reason });
    return;
  }

  const event = req.body as The402WebhookEvent;
  if (!event?.id || !event?.type) {
    res.status(400).json({ error: 'malformed_event' });
    return;
  }

  // Idempotency check + record.
  const { data: existing } = await adminDb
    .from('the402_events')
    .select('id, processed_at')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existing?.processed_at) {
    logger.info({ event_id: event.id }, 'the402 event already processed — idempotent return');
    res.status(200).json({ ok: true, idempotent: true });
    return;
  }

  if (!existing) {
    await adminDb.from('the402_events').insert({
      event_id: event.id,
      event_type: event.type,
      service_id: event.service_id ?? null,
      payload: event,
    });
  }

  try {
    if (event.type !== 'job_dispatch') {
      // v1 only supports job_dispatch; ack the rest cleanly.
      await adminDb
        .from('the402_events')
        .update({
          processed_at: new Date().toISOString(),
          error: `unsupported_event_type:${event.type}`,
        })
        .eq('event_id', event.id);
      res.status(200).json({ ok: true, supported: false });
      return;
    }

    if (!event.callback_url) {
      throw new Error('job_dispatch missing callback_url');
    }

    // SSRF guard: validate the callback BEFORE doing any (paid) provider work,
    // so an unsafe URL can't make us hit internal infra or burn provider calls
    // on an undeliverable result.
    const urlCheck = validateCallbackUrl(event.callback_url);
    if (!urlCheck.ok) {
      logger.warn(
        { event_id: event.id, callback: event.callback_url, reason: urlCheck.reason },
        'the402 unsafe callback_url rejected',
      );
      await adminDb
        .from('the402_events')
        .update({
          processed_at: new Date().toISOString(),
          error: `unsafe_callback_url:${urlCheck.reason}`,
        })
        .eq('event_id', event.id);
      // 400 (not 5xx) — the callback won't get safer on retry.
      res.status(400).json({ error: 'unsafe_callback_url', reason: urlCheck.reason });
      return;
    }

    // Look up which of our services this dispatch belongs to.
    const service = LISTED_SERVICES.find(
      (s) => s.name === event.service_name || s.name === event.service_id,
    );
    if (!service) {
      throw new Error(`unknown_service:${event.service_name ?? event.service_id}`);
    }

    const inputs = event.inputs ?? {};
    const linkedinUrl = typeof inputs.linkedin_url === 'string' ? inputs.linkedin_url : undefined;
    const fullName = typeof inputs.full_name === 'string' ? inputs.full_name : undefined;
    const companyDomain =
      typeof inputs.company_domain === 'string' ? inputs.company_domain : undefined;
    const companyName =
      typeof inputs.company_name === 'string' ? inputs.company_name : undefined;

    // Same two-mode validation as the MCP + REST + x402 entry points: one
    // mode per call. the402 buyers shouldn't be passing both, but if they
    // do we reject explicitly rather than silently picking one.
    const isNameMode = !linkedinUrl && Boolean(fullName);
    if (!linkedinUrl && !fullName) {
      throw new Error(
        'inputs.linkedin_url OR inputs.full_name + company_domain/company_name required',
      );
    }
    if (linkedinUrl && fullName) {
      throw new Error('use either linkedin_url OR name+company, not both');
    }
    if (isNameMode && !companyDomain && !companyName) {
      throw new Error(
        'name mode requires inputs.company_domain or inputs.company_name',
      );
    }

    const emailTypes = Array.isArray(inputs.email_types)
      ? (inputs.email_types as ('work' | 'personal')[])
      : (['work', 'personal'] as const);
    const verifyEmails = inputs.verify === true;

    // Bypass consumeCredits — the402 already collected payment from the caller.
    const findInput = isNameMode
      ? {
          name_queries: [
            {
              kind: 'name' as const,
              full_name: fullName!,
              first_name:
                typeof inputs.first_name === 'string' ? inputs.first_name : undefined,
              last_name:
                typeof inputs.last_name === 'string' ? inputs.last_name : undefined,
              company_domain: companyDomain,
              company_name: companyName,
            },
          ],
        }
      : { linkedin_urls: [linkedinUrl!] };

    const results = await findEmails({
      ...findInput,
      providers: undefined,
      waterfall: true,
      email_types: [...emailTypes],
      verify: verifyEmails,
      request_id: event.id ?? randomUUID(),
    });

    const result = results[0];
    const deliverable = {
      linkedin_url: result?.linkedin_url ?? linkedinUrl ?? '',
      emails: result?.emails ?? [],
      person: result?.person ?? null,
      company: result?.company ?? null,
      providers_attempted: result?.providers_attempted ?? [],
    };

    await deliverResult(event.callback_url, deliverable);

    logger.info(
      {
        event_id: event.id,
        service: service.name,
        callback: event.callback_url,
        emails_found: deliverable.emails.length,
      },
      'the402 job delivered',
    );

    await adminDb
      .from('the402_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', event.id);

    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, event_id: event.id }, 'the402 webhook handler failed');
    await adminDb
      .from('the402_events')
      .update({ error: message })
      .eq('event_id', event.id);
    // 5xx so the402 retries per their retry policy.
    res.status(500).json({ error: 'handler_failed' });
  }

  // Suppress unused — `API_URL` is here for future outbound calls (earnings
  // page imports from a sibling file).
  void API_URL;
}

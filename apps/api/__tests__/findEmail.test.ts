import { beforeEach, describe, it, expect, vi } from 'vitest';
import { leadKey, normalizeLinkedinUrl, type NormalizedEmail } from '@scoop/types';
import type { ProviderName } from '../src/config.js';
import type { FindEmailsInput, FindEmailsOutput } from '../src/providers/types.js';

// The findEmails service reaches its dependencies through module-level
// singletons (provider registry, config gate, credit log, logger). We replace
// those modules with controllable fakes so the waterfall logic can be tested
// in isolation — no network, no DB, no real provider keys. We use two real
// ProviderName values (aleads, apollo) so the mock keys typecheck.
vi.mock('../src/config.js', () => ({ isProviderConfigured: () => true }));
vi.mock('../src/credits.js', () => ({ logCredit: () => {} }));
vi.mock('../src/logger.js', () => ({
  logger: { warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
}));
vi.mock('../src/providers/credits.js', () => ({ PROVIDER_ENABLED: {} }));
vi.mock('../src/providers/registry.js', () => ({
  DEFAULT_FINDER_CHAIN: ['aleads', 'apollo'],
  NAME_MODE_FINDER_CHAIN: ['aleads', 'apollo'],
  DEFAULT_VERIFIER: 'hunterio',
  verifiers: {},
  finders: {
    aleads: { name: 'aleads', findEmails: vi.fn() },
    apollo: { name: 'apollo', findEmails: vi.fn() },
  },
}));

import { findEmails } from '../src/services/findEmail.js';
import { finders } from '../src/providers/registry.js';

const p1 = vi.mocked(finders.aleads!.findEmails);
const p2 = vi.mocked(finders.apollo!.findEmails);

type Email = { address: string; type: 'work' | 'personal'; provider: string };

function mkEmail(address: string, type: 'work' | 'personal', provider: string): NormalizedEmail {
  return { address, type, verified: false, source_provider: provider as ProviderName };
}

/** Build a provider response that returns the given emails for every lead it sees. */
function respondWith(emailsPerLead: (leadIndex: number) => Email[], credits = 1) {
  return async (input: FindEmailsInput): Promise<FindEmailsOutput> => ({
    credits_used: credits,
    results: input.leads.map((lead, i) => ({
      lead_key: leadKey(lead),
      linkedin_url: lead.kind === 'linkedin' ? lead.linkedin_url : '',
      emails: emailsPerLead(i).map((e) => mkEmail(e.address, e.type, e.provider)),
    })),
  });
}

const url = (handle: string) => `https://linkedin.com/in/${handle}`;

const baseOpts = {
  waterfall: true,
  email_types: ['work'] as ('work' | 'personal')[],
  verify: false,
  providers: ['aleads', 'apollo'] as ProviderName[], // explicit chain → bypasses PROVIDER_ENABLED gate
};

beforeEach(() => {
  p1.mockReset();
  p2.mockReset();
});

describe('findEmails waterfall', () => {
  it('returns the first provider hit and short-circuits the rest', async () => {
    p1.mockImplementation(respondWith(() => [{ address: 'a@x.com', type: 'work', provider: 'aleads' }]));
    p2.mockImplementation(respondWith(() => []));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('a')] });

    expect(res).toHaveLength(1);
    expect(res[0]!.emails.map((e) => e.address)).toEqual(['a@x.com']);
    // p1 already satisfied the only requested type, so p2 must never run.
    expect(p2).not.toHaveBeenCalled();
    expect(res[0]!.providers_attempted).toEqual([{ provider: 'aleads', found: true, error: null }]);
  });

  it('falls through to the next provider when the first finds nothing', async () => {
    p1.mockImplementation(respondWith(() => []));
    p2.mockImplementation(respondWith(() => [{ address: 'b@x.com', type: 'work', provider: 'apollo' }]));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('b')] });

    expect(res[0]!.emails.map((e) => e.address)).toEqual(['b@x.com']);
    expect(p1).toHaveBeenCalledOnce();
    expect(p2).toHaveBeenCalledOnce();
    expect(res[0]!.providers_attempted.map((a) => [a.provider, a.found])).toEqual([
      ['aleads', false],
      ['apollo', true],
    ]);
  });

  it('keeps every requested type a single provider returns in one response', async () => {
    p1.mockImplementation(
      respondWith(() => [
        { address: 'work@x.com', type: 'work', provider: 'aleads' },
        { address: 'home@x.com', type: 'personal', provider: 'aleads' },
      ]),
    );

    const res = await findEmails({
      ...baseOpts,
      email_types: ['work', 'personal'],
      linkedin_urls: [url('a')],
    });

    expect(res[0]!.emails.map((e) => e.type)).toEqual(['work', 'personal']);
    expect(p2).not.toHaveBeenCalled();
  });

  it('short-circuits the waterfall once a lead has ANY requested type', async () => {
    // Documents current behaviour: a lead is dropped from the waterfall as soon
    // as it has one of the requested types. So requesting ['work','personal']
    // but getting only 'work' from p1 stops the search — p2 is never asked for
    // the personal email. (Intended cost-control, or a partial-result bug? Worth
    // a product decision — this test will flag if the behaviour changes.)
    p1.mockImplementation(respondWith(() => [{ address: 'work@x.com', type: 'work', provider: 'aleads' }]));
    p2.mockImplementation(
      respondWith(() => [{ address: 'home@x.com', type: 'personal', provider: 'apollo' }]),
    );

    const res = await findEmails({
      ...baseOpts,
      email_types: ['work', 'personal'],
      linkedin_urls: [url('a')],
    });

    expect(res[0]!.emails.map((e) => e.type)).toEqual(['work']);
    expect(p2).not.toHaveBeenCalled();
  });

  it('preserves input order in the output, regardless of provider result order', async () => {
    // Provider returns results in reverse; findEmails must realign to input order.
    p1.mockImplementation(async (input: FindEmailsInput): Promise<FindEmailsOutput> => ({
      credits_used: 1,
      results: [...input.leads].reverse().map((lead) => ({
        lead_key: leadKey(lead),
        linkedin_url: lead.kind === 'linkedin' ? lead.linkedin_url : '',
        emails: [mkEmail(`${lead.kind === 'linkedin' ? lead.linkedin_url : ''}@x.com`, 'work', 'aleads')],
      })),
    }));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('first'), url('second')] });

    expect(res.map((r) => r.linkedin_url)).toEqual([
      normalizeLinkedinUrl(url('first')),
      normalizeLinkedinUrl(url('second')),
    ]);
  });

  it('records a provider error and continues the waterfall', async () => {
    p1.mockRejectedValue(new Error('upstream 500'));
    p2.mockImplementation(respondWith(() => [{ address: 'b@x.com', type: 'work', provider: 'apollo' }]));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('b')] });

    expect(res[0]!.emails.map((e) => e.address)).toEqual(['b@x.com']);
    expect(res[0]!.providers_attempted).toEqual([
      { provider: 'aleads', found: false, error: 'upstream 500' },
      { provider: 'apollo', found: true, error: null },
    ]);
  });

  it('rejects when no leads are supplied', async () => {
    await expect(findEmails({ ...baseOpts })).rejects.toMatchObject({ message: 'no_leads' });
    expect(p1).not.toHaveBeenCalled();
  });

  it('rejects when none of the requested providers are available', async () => {
    await expect(
      findEmails({ ...baseOpts, providers: ['ghost'] as unknown as ProviderName[], linkedin_urls: [url('a')] }),
    ).rejects.toMatchObject({ message: 'no_configured_providers' });
  });
});

describe('findEmails cancellation (AbortSignal)', () => {
  it('stops the waterfall before the next round once aborted', async () => {
    const controller = new AbortController();
    // p1 finds nothing AND aborts mid-flight (as the x402 deadline would),
    // so the waterfall must stop instead of falling through to p2.
    p1.mockImplementation(async (input: FindEmailsInput): Promise<FindEmailsOutput> => {
      controller.abort();
      return respondWith(() => [])(input);
    });
    p2.mockImplementation(respondWith(() => [{ address: 'b@x.com', type: 'work', provider: 'apollo' }]));

    const res = await findEmails({
      ...baseOpts,
      linkedin_urls: [url('cancelled')],
      signal: controller.signal,
    });

    expect(p2).not.toHaveBeenCalled();
    expect(res[0]!.emails).toEqual([]);
    expect(res[0]!.providers_attempted.map((a) => a.provider)).toEqual(['aleads']);
  });

  it('passes the signal through to each provider', async () => {
    const controller = new AbortController();
    p1.mockImplementation(respondWith(() => [{ address: 'a@x.com', type: 'work', provider: 'aleads' }]));

    await findEmails({
      ...baseOpts,
      linkedin_urls: [url('signal-through')],
      signal: controller.signal,
    });

    expect(p1.mock.calls[0]![0].signal).toBe(controller.signal);
  });

  it('runs the full waterfall when no signal is provided (unchanged behavior)', async () => {
    p1.mockImplementation(respondWith(() => []));
    p2.mockImplementation(respondWith(() => [{ address: 'b@x.com', type: 'work', provider: 'apollo' }]));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('no-signal')] });

    expect(p1).toHaveBeenCalledOnce();
    expect(p2).toHaveBeenCalledOnce();
    expect(res[0]!.emails.map((e) => e.address)).toEqual(['b@x.com']);
  });
});

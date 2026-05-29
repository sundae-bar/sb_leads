import { beforeEach, describe, it, expect, vi } from 'vitest';
import { leadKey, normalizeLinkedinUrl } from '@scoop/types';
import type { FindEmailsInput, FindEmailsOutput } from '../src/providers/types.js';

// The findEmails service reaches its dependencies through module-level
// singletons (provider registry, config gate, credit log, logger). We replace
// those modules with controllable fakes so the waterfall logic can be tested
// in isolation — no network, no DB, no real provider keys.
vi.mock('../src/config.js', () => ({ isProviderConfigured: () => true }));
vi.mock('../src/credits.js', () => ({ logCredit: () => {} }));
vi.mock('../src/logger.js', () => ({
  logger: { warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
}));
vi.mock('../src/providers/credits.js', () => ({ PROVIDER_ENABLED: {} }));
vi.mock('../src/providers/registry.js', () => ({
  DEFAULT_FINDER_CHAIN: ['p1', 'p2'],
  NAME_MODE_FINDER_CHAIN: ['p1', 'p2'],
  DEFAULT_VERIFIER: 'verifier',
  verifiers: {},
  finders: {
    p1: { name: 'p1', findEmails: vi.fn() },
    p2: { name: 'p2', findEmails: vi.fn() },
  },
}));

import { findEmails } from '../src/services/findEmail.js';
import { finders } from '../src/providers/registry.js';

// Cast the mocked finders' methods to vitest mock fns for ergonomics.
const p1 = finders.p1.findEmails as unknown as ReturnType<typeof vi.fn>;
const p2 = finders.p2.findEmails as unknown as ReturnType<typeof vi.fn>;

type Email = { address: string; type: 'work' | 'personal'; provider: string };

function mkEmail(address: string, type: 'work' | 'personal', provider: string) {
  return { address, type, verified: false, source_provider: provider };
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
  providers: ['p1', 'p2'] as never, // explicit chain → bypasses PROVIDER_ENABLED gate
};

beforeEach(() => {
  p1.mockReset();
  p2.mockReset();
});

describe('findEmails waterfall', () => {
  it('returns the first provider hit and short-circuits the rest', async () => {
    p1.mockImplementation(respondWith(() => [{ address: 'a@x.com', type: 'work', provider: 'p1' }]));
    p2.mockImplementation(respondWith(() => []));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('a')] });

    expect(res).toHaveLength(1);
    expect(res[0].emails.map((e) => e.address)).toEqual(['a@x.com']);
    // p1 already satisfied the only requested type, so p2 must never run.
    expect(p2).not.toHaveBeenCalled();
    expect(res[0].providers_attempted).toEqual([{ provider: 'p1', found: true, error: null }]);
  });

  it('falls through to the next provider when the first finds nothing', async () => {
    p1.mockImplementation(respondWith(() => []));
    p2.mockImplementation(respondWith(() => [{ address: 'b@x.com', type: 'work', provider: 'p2' }]));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('b')] });

    expect(res[0].emails.map((e) => e.address)).toEqual(['b@x.com']);
    expect(p1).toHaveBeenCalledOnce();
    expect(p2).toHaveBeenCalledOnce();
    expect(res[0].providers_attempted.map((a) => [a.provider, a.found])).toEqual([
      ['p1', false],
      ['p2', true],
    ]);
  });

  it('keeps every requested type a single provider returns in one response', async () => {
    p1.mockImplementation(
      respondWith(() => [
        { address: 'work@x.com', type: 'work', provider: 'p1' },
        { address: 'home@x.com', type: 'personal', provider: 'p1' },
      ]),
    );

    const res = await findEmails({
      ...baseOpts,
      email_types: ['work', 'personal'],
      linkedin_urls: [url('a')],
    });

    expect(res[0].emails.map((e) => e.type)).toEqual(['work', 'personal']);
    expect(p2).not.toHaveBeenCalled();
  });

  it('short-circuits the waterfall once a lead has ANY requested type', async () => {
    // Documents current behaviour: a lead is dropped from the waterfall as soon
    // as it has one of the requested types. So requesting ['work','personal']
    // but getting only 'work' from p1 stops the search — p2 is never asked for
    // the personal email. (Intended cost-control, or a partial-result bug? Worth
    // a product decision — this test will flag if the behaviour changes.)
    p1.mockImplementation(respondWith(() => [{ address: 'work@x.com', type: 'work', provider: 'p1' }]));
    p2.mockImplementation(
      respondWith(() => [{ address: 'home@x.com', type: 'personal', provider: 'p2' }]),
    );

    const res = await findEmails({
      ...baseOpts,
      email_types: ['work', 'personal'],
      linkedin_urls: [url('a')],
    });

    expect(res[0].emails.map((e) => e.type)).toEqual(['work']);
    expect(p2).not.toHaveBeenCalled();
  });

  it('preserves input order in the output, regardless of provider result order', async () => {
    // Provider returns results in reverse; findEmails must realign to input order.
    p1.mockImplementation(async (input: FindEmailsInput): Promise<FindEmailsOutput> => ({
      credits_used: 1,
      results: [...input.leads]
        .reverse()
        .map((lead) => ({
          lead_key: leadKey(lead),
          linkedin_url: lead.kind === 'linkedin' ? lead.linkedin_url : '',
          emails: [mkEmail(`${(lead as { linkedin_url: string }).linkedin_url}@x.com`, 'work', 'p1')],
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
    p2.mockImplementation(respondWith(() => [{ address: 'b@x.com', type: 'work', provider: 'p2' }]));

    const res = await findEmails({ ...baseOpts, linkedin_urls: [url('b')] });

    expect(res[0].emails.map((e) => e.address)).toEqual(['b@x.com']);
    expect(res[0].providers_attempted).toEqual([
      { provider: 'p1', found: false, error: 'upstream 500' },
      { provider: 'p2', found: true, error: null },
    ]);
  });

  it('rejects when no leads are supplied', async () => {
    await expect(findEmails({ ...baseOpts })).rejects.toMatchObject({ message: 'no_leads' });
    expect(p1).not.toHaveBeenCalled();
  });

  it('rejects when none of the requested providers are available', async () => {
    await expect(
      findEmails({ ...baseOpts, providers: ['ghost'] as never, linkedin_urls: [url('a')] }),
    ).rejects.toMatchObject({ message: 'no_configured_providers' });
  });
});

import { afterEach, describe, it, expect } from 'vitest';
import { validateCallbackUrl } from '../src/integrations/the402/callback-url.js';

const ORIGINAL_ALLOWLIST = process.env.THE402_CALLBACK_HOSTS;

afterEach(() => {
  if (ORIGINAL_ALLOWLIST === undefined) delete process.env.THE402_CALLBACK_HOSTS;
  else process.env.THE402_CALLBACK_HOSTS = ORIGINAL_ALLOWLIST;
});

describe('validateCallbackUrl (the402 SSRF guard)', () => {
  it('accepts a normal public https URL', () => {
    expect(validateCallbackUrl('https://api.the402.ai/jobs/job_123/deliver')).toEqual({ ok: true });
  });

  it('rejects non-https schemes', () => {
    expect(validateCallbackUrl('http://api.the402.ai/x')).toEqual({ ok: false, reason: 'not_https' });
    expect(validateCallbackUrl('ftp://api.the402.ai/x')).toEqual({ ok: false, reason: 'not_https' });
  });

  it('rejects malformed URLs', () => {
    expect(validateCallbackUrl('not a url')).toEqual({ ok: false, reason: 'invalid_url' });
  });

  it('rejects localhost and loopback', () => {
    expect(validateCallbackUrl('https://localhost/x').ok).toBe(false);
    expect(validateCallbackUrl('https://127.0.0.1/x')).toEqual({ ok: false, reason: 'private_host' });
    expect(validateCallbackUrl('https://[::1]/x')).toEqual({ ok: false, reason: 'private_host' });
  });

  it('rejects the cloud metadata endpoint and link-local range', () => {
    expect(validateCallbackUrl('https://169.254.169.254/latest/meta-data')).toEqual({
      ok: false,
      reason: 'private_host',
    });
  });

  it('rejects RFC-1918 private ranges', () => {
    for (const ip of ['10.0.0.5', '192.168.1.1', '172.16.4.4', '172.31.255.255']) {
      expect(validateCallbackUrl(`https://${ip}/x`)).toEqual({ ok: false, reason: 'private_host' });
    }
  });

  it('enforces the allowlist when THE402_CALLBACK_HOSTS is set', () => {
    process.env.THE402_CALLBACK_HOSTS = 'api.the402.ai, hooks.the402.ai';
    expect(validateCallbackUrl('https://api.the402.ai/x')).toEqual({ ok: true });
    expect(validateCallbackUrl('https://evil.example.com/x')).toEqual({
      ok: false,
      reason: 'host_not_allowlisted',
    });
  });
});

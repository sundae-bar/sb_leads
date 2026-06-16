// SSRF defense for the402 job callbacks.
//
// the402 HMAC-signs every webhook, so `callback_url` is authentic — but we POST
// to it carrying our THE402_API_KEY, so a compromised or buggy marketplace must
// not be able to point us at internal infrastructure (cloud metadata, private
// ranges, localhost). We require https and reject private/reserved hosts.
//
// If THE402_CALLBACK_HOSTS is set (comma-separated hostnames), we additionally
// require the host to be on that allowlist — the strongest option, recommended
// for production. NOTE: hostname checks alone don't defeat DNS rebinding (a
// public name resolving to a private IP); the allowlist does.

export type CallbackUrlCheck = { ok: true } | { ok: false; reason: string };

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some((n) => n > 255)) return true; // malformed dotted-quad → unsafe
  const [a, b] = octets as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, ''); // strip IPv6 brackets
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '::1' || h === '::') return true; // IPv6 loopback / unspecified
  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true; // link-local + ULA
  return isPrivateIpv4(h);
}

export function validateCallbackUrl(raw: string): CallbackUrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'not_https' };
  const host = url.hostname;
  if (!host) return { ok: false, reason: 'invalid_url' };
  if (isPrivateHost(host)) return { ok: false, reason: 'private_host' };

  const allowlist = (process.env.THE402_CALLBACK_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(host.toLowerCase())) {
    return { ok: false, reason: 'host_not_allowlisted' };
  }
  return { ok: true };
}

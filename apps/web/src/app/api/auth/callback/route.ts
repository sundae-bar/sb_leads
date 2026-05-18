import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Build the public-facing origin from forwarded headers when behind a proxy
 * (Railway → Cloudflare → Next on internal port 8080). Next's `new URL(request.url).origin`
 * uses whatever Host the inner server saw, which can be `http://localhost:8080`
 * — then we redirect the user to a private internal hostname they can't reach.
 *
 * Headers Railway sets:
 *   X-Forwarded-Proto: https
 *   X-Forwarded-Host:  scoop.sundaebar.ai
 *
 * Falls back to request.url's origin for local dev (no proxy = no forwarded headers).
 */
function publicOrigin(request: Request): string {
  const proto = request.headers.get('x-forwarded-proto');
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

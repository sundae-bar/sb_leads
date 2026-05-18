import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Build the redirect response FIRST so we can attach cookies to it as
  // exchangeCodeForSession sets them. Returning a fresh NextResponse from
  // outside this block would lose the Set-Cookie headers (Next 15+ doesn't
  // propagate cookies().set(...) onto redirect responses automatically).
  const response = NextResponse.redirect(`${origin}${next}`);
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-tenant-starter' },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Write to both the request-scope store (for subsequent reads in
          // this handler) AND the outgoing redirect response (so the browser
          // actually gets the session cookie).
          try {
            cookieStore.set(name, value, options);
          } catch {}
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {}
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  return response;
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Build the public-facing origin from forwarded headers when behind a proxy
 * (Railway → Cloudflare → Next on internal port 8080). Next's `new URL(request.url).origin`
 * uses whatever Host the inner server saw, which can be `http://localhost:8080`.
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

  // Build the redirect response FIRST so we can attach session cookies to it
  // as exchangeCodeForSession sets them. Using getAll/setAll (the modern
  // @supabase/ssr 0.5+ API) so the entire chunked-cookie write happens in
  // one batch — the old per-cookie set callback dropped chunks on Next 15+.
  const response = NextResponse.redirect(`${origin}${next}`);
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-tenant-starter' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            // Update the request-scope store so any follow-up reads inside
            // this handler see the new values.
            try {
              cookieStore.set(name, value, options);
            } catch {
              // ignore — server-component restrictions don't apply here
            }
            // The critical part: attach the cookie to the outgoing redirect
            // response so the browser actually receives Set-Cookie headers.
            response.cookies.set(name, value, options);
          }
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

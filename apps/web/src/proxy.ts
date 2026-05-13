import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];

// Public pages — no auth required, no redirects. The marketing landing at /
// is the only one for now; add more here as the marketing site grows
// (`/pricing`, `/docs`, etc.).
const PUBLIC_ROUTES = ['/'];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.includes(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Marketing pages render for everyone — skip the auth gate entirely.
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-tenant-starter' },
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set(name, '');
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users → /login (except auth pages and onboarding).
  if (!user && !isAuthRoute(pathname) && pathname !== '/onboarding') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated users on an auth page → app.
  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  // Authenticated users without an active tenant → /onboarding.
  // Source of truth is the JWT app_metadata claim. If a membership exists but
  // the claim is empty, backfill it; the user will need to refresh their
  // session to pick up the new JWT (handled by /onboarding's create flow,
  // or by signing out and back in for legacy logged-in users).
  if (user && pathname !== '/onboarding' && !pathname.startsWith('/api/')) {
    const activeTenantId = (user.app_metadata as { active_tenant_id?: string } | null)
      ?.active_tenant_id;

    if (!activeTenantId) {
      // Try to backfill from existing membership (one-shot for legacy users).
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );
      const { data: membership } = await admin
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (membership) {
        await admin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            ...(user.app_metadata ?? {}),
            active_tenant_id: membership.tenant_id,
          },
        });
        // The cookie's JWT is still stale; bounce to /login so the next
        // visit issues a fresh session with the new claim.
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }

      // No membership → onboarding.
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

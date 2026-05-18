import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for Route Handlers + Server Components.
 *
 * Uses @supabase/ssr's modern getAll/setAll callback API (0.5+). This
 * matters because the older per-cookie set callback couldn't reliably
 * carry chunked session cookies onto a redirect response, leading to
 * sessions that were "created" but then lost on the next request — see
 * `apps/web/src/app/api/auth/callback/route.ts` for the route-handler
 * variant that also attaches cookies to a redirect response.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-tenant-starter' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — set is read-only there.
            // Safe to ignore; cookies still propagate via the middleware path.
          }
        },
      },
    },
  );
}

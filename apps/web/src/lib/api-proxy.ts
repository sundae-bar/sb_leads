import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/constants';

type CallApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** JSON body to forward (POST/PUT). */
  body?: unknown;
  /**
   * Use refreshSession() — which mints a JWT carrying current app_metadata
   * claims (e.g. active_tenant_id) — instead of the cached getSession(). Use
   * for writes / anything sensitive to a just-changed tenant.
   */
  refresh?: boolean;
  /** Fallback message if the fetch itself throws (network error). */
  errorMessage?: string;
};

export type CallApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

async function getToken(refresh: boolean): Promise<string | undefined> {
  const supabase = await createClient();
  const {
    data: { session },
  } = refresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession();
  return session?.access_token;
}

/**
 * Shared plumbing for the Next route handlers that proxy to the Express API:
 * auth gate → token → fetch → upstream-error mapping. Returns the parsed body
 * on success, or a ready-to-return NextResponse on failure (401 when not
 * signed in, the upstream status for a non-2xx, 500 if the fetch throws).
 * Callers shape the success response themselves (status code, transform).
 */
export async function callApi<T = unknown>(
  path: string,
  opts: CallApiOptions = {},
): Promise<CallApiResult<T>> {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const token = await getToken(opts.refresh ?? false);
    const res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({ error: res.statusText }))) as {
        message?: string;
        error?: string;
      };
      const message = errBody.message ?? errBody.error ?? `Request failed: ${res.status}`;
      return { ok: false, response: NextResponse.json({ error: message }, { status: res.status }) };
    }

    if (res.status === 204) return { ok: true, data: undefined as T };
    return { ok: true, data: (await res.json()) as T };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : (opts.errorMessage ?? 'Request failed');
    return { ok: false, response: NextResponse.json({ error: message }, { status: 500 }) };
  }
}

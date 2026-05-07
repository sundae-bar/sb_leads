import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';
import type { ApiKeyResponse, CreateApiKeyRequest, CreateApiKeyResponse } from '@sundae/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getToken() {
  const supabase = await createClient();
  // Always use refreshSession so the JWT includes current app_metadata claims
  // (e.g. active_tenant_id). getSession() returns a cached/stale token.
  const { data: { session } } = await supabase.auth.refreshSession();
  return session?.access_token;
}

export async function GET() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/v1/api-keys`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? `Request failed: ${res.status}`);
    }

    return NextResponse.json(await res.json() as ApiKeyResponse[]);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch API keys';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await getToken();
    const body = await request.json() as CreateApiKeyRequest;

    const res = await fetch(`${API_URL}/api/v1/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errBody.message ?? errBody.error ?? `Request failed: ${res.status}`);
    }

    return NextResponse.json(await res.json() as CreateApiKeyResponse, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create API key';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

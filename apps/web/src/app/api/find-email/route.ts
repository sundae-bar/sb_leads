import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/constants';

async function getToken() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.refreshSession();
  return session?.access_token;
}

export async function POST(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await getToken();
    const body = await request.json();

    const res = await fetch(`${API_URL}/find-email`, {
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

    return NextResponse.json(await res.json());
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to find email';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';
import type { AgentRun } from '@scoop/types';
import { transformAgentRunToTrace } from '@/lib/trace-transform';
import { API_URL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const searchParams = request.nextUrl.searchParams;
    const queryParams = new URLSearchParams();
    for (const [key, val] of searchParams.entries()) queryParams.set(key, val);

    const res = await fetch(`${API_URL}/api/v1/traces?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? `Request failed: ${res.status}`);
    }

    const traces = await res.json() as AgentRun[];
    return NextResponse.json(traces.map((t) => transformAgentRunToTrace(t)));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch traces';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

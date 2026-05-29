import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthProvider } from '@/lib/auth';
import type { AgentRun, AgentRunStep } from '@scoop/types';
import { transformAgentRunToTrace } from '@/lib/trace-transform';
import { API_URL } from '@/lib/constants';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${API_URL}/api/v1/traces/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
      }
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? `Request failed: ${res.status}`);
    }

    const traceData = await res.json() as AgentRun & { steps: AgentRunStep[] };

    // Transform to UI format
    const transformedTrace = transformAgentRunToTrace(traceData, traceData.steps || []);

    return NextResponse.json(transformedTrace);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trace';
    console.error('[traces] error:', error);
    if (message.includes('404') || message.includes('not found')) {
      return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

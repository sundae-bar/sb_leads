import { NextRequest, NextResponse } from 'next/server';
import type { AgentRun } from '@scoop/types';
import { transformAgentRunToTrace } from '@/lib/trace-transform';
import { callApi } from '@/lib/api-proxy';

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString();
  const r = await callApi<AgentRun[]>(`/api/v1/traces${qs ? `?${qs}` : ''}`);
  if (!r.ok) return r.response;
  return NextResponse.json(r.data.map((t) => transformAgentRunToTrace(t)));
}

import { NextRequest, NextResponse } from 'next/server';
import type { AgentRun, AgentRunStep } from '@scoop/types';
import { transformAgentRunToTrace } from '@/lib/trace-transform';
import { callApi } from '@/lib/api-proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const r = await callApi<AgentRun & { steps: AgentRunStep[] }>(`/api/v1/traces/${id}`);
  if (!r.ok) return r.response; // upstream 404 → 404 passes through
  return NextResponse.json(transformAgentRunToTrace(r.data, r.data.steps || []));
}

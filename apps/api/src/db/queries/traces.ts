import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentRun, AgentRunStep } from '@scoop/types';

export async function listAgentRuns(
  supabase: SupabaseClient,
  opts: { status?: string; agentName?: string; limit?: number; offset?: number },
): Promise<AgentRun[]> {
  let query = supabase
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(opts.limit ?? 50)
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 50) - 1);

  if (opts.status) query = query.eq('status', opts.status);
  if (opts.agentName) query = query.eq('agent_name', opts.agentName);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toAgentRun);
}

export async function getAgentRun(
  supabase: SupabaseClient,
  id: string,
): Promise<AgentRun | null> {
  const { data, error } = await supabase.from('agent_runs').select('*').eq('id', id).single();
  if (error) return null;
  return toAgentRun(data);
}

export async function listAgentRunSteps(
  supabase: SupabaseClient,
  runId: string,
): Promise<AgentRunStep[]> {
  const { data, error } = await supabase
    .from('agent_run_steps')
    .select('*')
    .eq('run_id', runId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toAgentRunStep);
}

function toAgentRun(row: Record<string, unknown>): AgentRun {
  return {
    id: row.id as string,
    userId: row.user_id as string | null,
    tenantId: row.tenant_id as string,
    conversationId: row.conversation_id as string | null,
    triggerType: row.trigger_type as AgentRun['triggerType'],
    agentName: row.agent_name as string,
    status: row.status as AgentRun['status'],
    input: row.input,
    output: row.output,
    error: row.error as string | null,
    model: row.model as string | null,
    totalTokens: row.total_tokens as number | null,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | null,
    durationMs: row.duration_ms as number | null,
  };
}

function toAgentRunStep(row: Record<string, unknown>): AgentRunStep {
  return {
    id: row.id as string,
    stepType: row.step_type as AgentRunStep['stepType'],
    stepName: row.step_name as string,
    input: row.input,
    output: row.output,
    error: row.error as string | undefined,
    sequence: row.sequence as number,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | undefined,
    durationMs: row.duration_ms as number | undefined,
  };
}

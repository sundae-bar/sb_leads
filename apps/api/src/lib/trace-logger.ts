import type { SupabaseClient } from '@supabase/supabase-js';
import type { StepResult, ToolSet } from 'ai';
import { logger } from '../logger.js';

interface StartRunParams {
  agentName: string;
  triggerType: 'chat' | 'cron' | 'webhook' | 'manual';
  userId?: string;
  tenantId: string;
  conversationId?: string;
  input?: unknown;
}

interface CompleteRunParams {
  output?: unknown;
  model?: string;
  totalTokens?: number;
}

export interface TraceLogger {
  startRun(params: StartRunParams): Promise<{ id: string }>;
  logStep<T extends ToolSet>(runId: string, step: StepResult<T>, sequence: number): Promise<void>;
  completeRun(runId: string, params: CompleteRunParams): Promise<void>;
  failRun(runId: string, err: unknown): Promise<void>;
}

// Pass a user-scoped client for chat (RLS enforces tenancy) or adminDb for cron.
export function makeTraceLogger(supabase: SupabaseClient): TraceLogger {
  return {
    async startRun(params) {
      const { data, error } = await supabase
        .from('agent_runs')
        .insert({
          agent_name: params.agentName,
          trigger_type: params.triggerType,
          user_id: params.userId ?? null,
          tenant_id: params.tenantId,
          conversation_id: params.conversationId ?? null,
          status: 'running',
          input: params.input ?? null,
        })
        .select('id')
        .single();

      if (error) {
        logger.error({ error }, 'Failed to start agent run');
        throw error;
      }
      return { id: data.id };
    },

    async logStep(runId, step, sequence) {
      const completedAt = new Date();

      const { data: run } = await supabase
        .from('agent_runs')
        .select('started_at')
        .eq('id', runId)
        .single();

      const runStartTime = run?.started_at
        ? new Date(run.started_at).getTime()
        : completedAt.getTime();
      const stepStartTime = runStartTime;
      const durationMs = completedAt.getTime() - stepStartTime;

      const { error } = await supabase.from('agent_run_steps').insert({
        run_id: runId,
        step_type: step.stepType === 'initial' ? 'llm_call' : step.stepType,
        step_name: step.stepType,
        input: {
          messages: step.request?.body ? JSON.parse(step.request.body as string) : null,
        },
        output: {
          text: step.text,
          toolCalls: step.toolCalls,
          toolResults: step.toolResults,
          usage: step.usage,
        },
        sequence,
        started_at: new Date(stepStartTime).toISOString(),
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs > 0 ? durationMs : null,
      });

      if (error) logger.error({ error }, 'Failed to log step');
    },

    async completeRun(runId, params) {
      const { data: run, error: fetchError } = await supabase
        .from('agent_runs')
        .select('started_at')
        .eq('id', runId)
        .single();

      if (fetchError) {
        logger.error({ error: fetchError }, 'Failed to fetch run for duration calculation');
      }

      const completedAt = new Date();
      const startedAt = run?.started_at ? new Date(run.started_at) : completedAt;
      const durationMs = completedAt.getTime() - startedAt.getTime();

      const { error } = await supabase
        .from('agent_runs')
        .update({
          status: 'completed',
          output: params.output ?? null,
          model: params.model ?? null,
          total_tokens: params.totalTokens ?? null,
          completed_at: completedAt.toISOString(),
          duration_ms: durationMs > 0 ? durationMs : null,
        })
        .eq('id', runId);

      if (error) logger.error({ error }, 'Failed to complete agent run');
    },

    async failRun(runId, err) {
      const message = err instanceof Error ? err.message : String(err);
      const { error } = await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      if (error) logger.error({ error }, 'Failed to mark run as failed');
    },
  };
}

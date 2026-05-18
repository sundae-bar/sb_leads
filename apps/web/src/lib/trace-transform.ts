import type { AgentRun, AgentRunStep } from '@/types';
import type { Trace, TraceStep } from './traces-data';

// Status mapping: DB format → UI format
const statusMap: Record<'completed' | 'failed' | 'running', 'success' | 'error' | 'running'> = {
  'completed': 'success',
  'failed': 'error',
  'running': 'running',
};

// Step type mapping: DB format (snake_case) → UI format (kebab-case)
const stepTypeMap: Record<'llm_call' | 'tool_call' | 'tool_result' | 'error', 'llm-call' | 'tool-call' | 'tool-result' | 'error'> = {
  'llm_call': 'llm-call',
  'tool_call': 'tool-call',
  'tool_result': 'tool-result',
  'error': 'error',
};

/**
 * Extract token counts from step output/metadata
 * Looks for usage information in the output JSONB field
 */
function extractTokensFromStep(step: AgentRunStep): { promptTokens?: number; completionTokens?: number } {
  if (!step.output || typeof step.output !== 'object') {
    return {};
  }

  const output = step.output as Record<string, unknown>;
  
  // Check for usage object (common in AI SDK responses)
  if (output.usage && typeof output.usage === 'object') {
    const usage = output.usage as Record<string, unknown>;
    return {
      promptTokens: typeof usage.promptTokens === 'number' ? usage.promptTokens : undefined,
      completionTokens: typeof usage.completionTokens === 'number' ? usage.completionTokens : undefined,
    };
  }

  // Check for direct token fields
  if (typeof output.promptTokens === 'number' || typeof output.completionTokens === 'number') {
    return {
      promptTokens: typeof output.promptTokens === 'number' ? output.promptTokens : undefined,
      completionTokens: typeof output.completionTokens === 'number' ? output.completionTokens : undefined,
    };
  }

  return {};
}

/**
 * Transform AgentRunStep to TraceStep
 */
function transformStep(step: AgentRunStep): TraceStep {
  const tokens = extractTokensFromStep(step);
  
  return {
    id: step.id,
    type: stepTypeMap[step.stepType] || step.stepType as TraceStep['type'],
    name: step.stepName,
    startedAt: step.startedAt,
    duration: step.durationMs || 0,
    input: step.input ? JSON.stringify(step.input, null, 2) : undefined,
    output: step.output ? JSON.stringify(step.output, null, 2) : undefined,
    model: step.stepType === 'llm_call' && step.output && typeof step.output === 'object' 
      ? (step.output as Record<string, unknown>).model as string | undefined
      : undefined,
    promptTokens: tokens.promptTokens,
    completionTokens: tokens.completionTokens,
    // Tool-specific fields
    toolName: step.stepType === 'tool_call' ? step.stepName : undefined,
    args: step.stepType === 'tool_call' && step.input 
      ? JSON.stringify(step.input, null, 2) 
      : undefined,
    result: step.stepType === 'tool_result' && step.output 
      ? JSON.stringify(step.output, null, 2) 
      : undefined,
  };
}

/**
 * Calculate token breakdown from steps or fallback to total_tokens
 */
function calculateTokenBreakdown(
  steps: AgentRunStep[],
  totalTokens: number | null
): { promptTokens: number; completionTokens: number } {
  // Try to sum up tokens from steps
  let promptSum = 0;
  let completionSum = 0;
  let hasStepTokens = false;

  for (const step of steps) {
    const tokens = extractTokensFromStep(step);
    if (tokens.promptTokens !== undefined) {
      promptSum += tokens.promptTokens;
      hasStepTokens = true;
    }
    if (tokens.completionTokens !== undefined) {
      completionSum += tokens.completionTokens;
      hasStepTokens = true;
    }
  }

  // If we have step-level tokens, use them
  if (hasStepTokens) {
    return {
      promptTokens: promptSum,
      completionTokens: completionSum,
    };
  }

  // Fallback: split total_tokens proportionally (rough estimate: 60/40 split)
  if (totalTokens !== null && totalTokens > 0) {
    return {
      promptTokens: Math.round(totalTokens * 0.6),
      completionTokens: Math.round(totalTokens * 0.4),
    };
  }

  return {
    promptTokens: 0,
    completionTokens: 0,
  };
}

/**
 * Transform AgentRun (with optional steps) to Trace format
 */
export function transformAgentRunToTrace(
  agentRun: AgentRun,
  steps: AgentRunStep[] = []
): Trace {
  const tokenBreakdown = calculateTokenBreakdown(steps, agentRun.totalTokens);
  
  // Calculate duration: use database value, or sum of step durations, or calculate from timestamps
  let duration = agentRun.durationMs || 0;
  if (duration === 0 && steps.length > 0) {
    // Fallback: sum all step durations
    duration = steps.reduce((sum, step) => sum + (step.durationMs || 0), 0);
  }
  if (duration === 0 && agentRun.completedAt && agentRun.startedAt) {
    // Fallback: calculate from timestamps
    const start = new Date(agentRun.startedAt).getTime();
    const end = new Date(agentRun.completedAt).getTime();
    duration = end - start;
  }
  
  const trace: Trace = {
    id: agentRun.id,
    name: agentRun.agentName,
    status: statusMap[agentRun.status] || 'error',
    model: agentRun.model || 'unknown',
    totalTokens: agentRun.totalTokens || 0,
    promptTokens: tokenBreakdown.promptTokens,
    completionTokens: tokenBreakdown.completionTokens,
    duration: duration,
    startedAt: agentRun.startedAt,
    steps: steps.map(transformStep),
    totalSteps: steps.length,
  };

  // Add aliases for UI compatibility (inputTokens/outputTokens)
  (trace as any).inputTokens = tokenBreakdown.promptTokens;
  (trace as any).outputTokens = tokenBreakdown.completionTokens;
  (trace as any).timestamp = new Date(agentRun.startedAt);

  return trace;
}

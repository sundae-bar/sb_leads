export interface AgentRunStep {
  id: string;
  stepType: 'llm_call' | 'tool_call' | 'tool_result' | 'error';
  stepName: string;
  input: unknown;
  output: unknown;
  error?: string;
  sequence: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

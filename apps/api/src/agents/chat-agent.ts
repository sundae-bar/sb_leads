import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { CoreMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { makeTraceLogger } from '../lib/trace-logger.js';

export async function runChatAgent(params: {
  supabase: SupabaseClient;
  conversationId: string;
  userId: string;
  tenantId: string;
  messages: CoreMessage[];
  onChunk: (text: string) => void;
}): Promise<{ text: string; totalTokens: number | undefined }> {
  const traceLogger = makeTraceLogger(params.supabase);

  const run = await traceLogger.startRun({
    agentName: 'chat-agent',
    triggerType: 'chat',
    userId: params.userId,
    tenantId: params.tenantId,
    conversationId: params.conversationId,
    input: { messageCount: params.messages.length },
  });

  let stepSequence = 0;

  try {
    const result = streamText({
      model: openai('gpt-5-mini'),
      system: 'You are a helpful assistant.',
      messages: params.messages,

      onStepFinish: async (step) => {
        try {
          await traceLogger.logStep(run.id, step, stepSequence++);
        } catch (err) {
          console.error('[chat-agent] step log error:', err);
        }
      },

      onFinish: ({ finishReason, usage }) => {
        console.log('[chat-agent] finished:', { finishReason, tokens: usage.totalTokens });
      },

      onError: ({ error }) => {
        console.error('[chat-agent] stream error:', JSON.stringify(error, null, 2));
      },
    });

    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
      params.onChunk(chunk);
    }

    const usage = await result.usage;

    await traceLogger.completeRun(run.id, {
      output: text,
      model: 'gpt-5-mini',
      totalTokens: usage.totalTokens,
    });

    return { text, totalTokens: usage.totalTokens };
  } catch (err) {
    console.error('[chat-agent] error:', err instanceof Error ? err.message : err);
    await traceLogger.failRun(run.id, err);
    throw err;
  }
}

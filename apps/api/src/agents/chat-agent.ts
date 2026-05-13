import { streamText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ModelMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { makeTraceLogger } from '../lib/trace-logger.js';
import { buildMcpTools } from './mcp-tools.js';
import { ensureManagedApiKey } from '../lib/managed-key.js';
import { config } from '../config.js';

const SYSTEM_PROMPT = `You are the Sundae Leads assistant.

You can find verified business emails, verify deliverability, surface
buying-intent signals, and browse the user's existing contacts. Each
find_email call costs 1 credit (refunded if no email is returned);
list_contacts is free.

Guidelines:
- Before calling find_email for a lead, ALWAYS call list_contacts first to
  check whether that lead (or one matching the user's query) is already
  saved. If it is and the email they want is present, surface that and
  skip the credit-charging tool.
- Always pass full LinkedIn URLs (https://www.linkedin.com/in/<handle>) to
  find_email.
- Prefer business emails unless the user asks for personal.
- If a tool returns "out_of_credits", tell the user clearly — don't retry.
- Summarise tool results concisely; don't dump raw JSON unless asked.`;

export async function runChatAgent(params: {
  supabase: SupabaseClient;
  conversationId: string;
  userId: string;
  tenantId: string;
  messages: ModelMessage[];
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

  // Mint or recover the chat agent's MCP API key for this tenant. The agent
  // calls /mcp the same way an external integrator would: HTTP + Bearer.
  const apiKey = await ensureManagedApiKey({
    tenantId: params.tenantId,
    userId: params.userId,
    name: 'Chat (managed)',
  });

  const apiBase = process.env.API_URL ?? `http://localhost:${config.port}`;
  const { tools, close } = await buildMcpTools({
    mcpUrl: `${apiBase}/mcp`,
    apiKey,
  });

  try {
    const result = streamText({
      model: openai('gpt-5-mini'),
      system: SYSTEM_PROMPT,
      messages: params.messages,
      tools,
      // Allow the model to make multiple tool calls in a single turn.
      stopWhen: stepCountIs(5),

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
  } finally {
    await close();
  }
}

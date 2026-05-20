import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { runChatAgent } from '../agents/chat-agent.js';
import {
  getConversation,
  createConversation,
  updateConversation,
} from '../db/queries/conversations.js';
import { listMessages, createMessage } from '../db/queries/messages.js';
import type { ModelMessage } from 'ai';

function generateTitleFromMessage(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 50).trim() + '...';
}

export const chatRouter = Router();

chatRouter.post(
  '/stream',
  requireAuth,
  validate(
    z.object({
      conversationId: z.string().uuid().nullable().optional(),
      message: z.string().min(1),
    }),
  ),
  async (req, res, next) => {
    try {
      const { conversationId: providedConversationId, message } = req.body as {
        conversationId: string | null | undefined;
        message: string;
      };
      const supabase = req.supabase;
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      console.log('[chat] stream request', { conversationId: providedConversationId, userId });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // No upfront credit charge for chat — the agent's tools (e.g. find_email)
      // bill per-call through MCP, dogfooding the same path external integrators
      // use. If the user has zero credits, the tool itself returns
      // "out_of_credits" and the model handles it.

      let conversationId = providedConversationId;
      let isNewConversation = false;
      if (!conversationId) {
        console.log('[chat] creating new conversation');
        const newConversation = await createConversation(supabase, userId, tenantId, 'New conversation');
        conversationId = newConversation.id;
        isNewConversation = true;
        res.write(`data: ${JSON.stringify({ conversationId })}\n\n`);
      }

      const conversation = await getConversation(supabase, conversationId!);
      if (!conversation) {
        console.log('[chat] conversation not found', conversationId);
        res.write(`data: ${JSON.stringify({ error: 'Conversation not found' })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }
      console.log('[chat] conversation found, saving user message');

      await createMessage(supabase, { conversationId: conversationId!, role: 'user', content: message });

      const history = await listMessages(supabase, conversationId!);
      const coreMessages: ModelMessage[] = history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      console.log('[chat] history length:', coreMessages.length);
      console.log('[chat] calling runChatAgent');

      let clientDisconnected = false;
      req.on('close', () => {
        console.log('[chat] client disconnected');
        clientDisconnected = true;
      });

      try {
        const { text, totalTokens, toolCalls } = await runChatAgent({
          supabase,
          conversationId: conversationId!,
          userId,
          tenantId,
          messages: coreMessages,
          onChunk: (chunk) => {
            try {
              if (!res.closed && !clientDisconnected) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
                if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
                  (res as unknown as { flush: () => void }).flush();
                }
              }
            } catch (writeErr) {
              console.error('[chat] error writing chunk:', writeErr);
              clientDisconnected = true;
            }
          },
          onToolResult: (record) => {
            // Forward tool results to the client as a separate SSE frame so
            // the UI can attach them to the in-flight assistant message and
            // render cards/tables inline. The serialised payload can be
            // large (full find_email result with provider attempts etc.) —
            // SSE handles that fine; the client parses one event per line.
            try {
              if (!res.closed && !clientDisconnected) {
                res.write(`data: ${JSON.stringify({ tool: record })}\n\n`);
                if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
                  (res as unknown as { flush: () => void }).flush();
                }
              }
            } catch (writeErr) {
              console.error('[chat] error writing tool result:', writeErr);
              clientDisconnected = true;
            }
          },
        });

        if (clientDisconnected) {
          console.log('[chat] client disconnected before completion');
          return;
        }

        console.log('[chat] agent done, tokens:', totalTokens);

        await createMessage(supabase, {
          conversationId: conversationId!,
          role: 'assistant',
          content: text,
          // `tool_calls` is what powers re-rendering of inline result cards
          // when the conversation is reloaded from history. Storing the
          // structured tool result (not just the model's prose summary) is
          // what makes the chat thread useful as a persistent record.
          metadata: { totalTokens, model: 'gpt-5-mini', tool_calls: toolCalls },
        });

        if (isNewConversation) {
          const title = generateTitleFromMessage(message);
          try {
            await updateConversation(supabase, conversationId!, title);
            console.log('[chat] updated conversation title:', title);
          } catch (err) {
            console.error('[chat] error updating conversation title:', err);
          }
        }

        if (!res.closed) {
          res.write(`data: [DONE]\n\n`);
          res.end();
        }
        console.log('[chat] stream ended');
      } catch (agentErr) {
        console.error('[chat] agent error:', agentErr);
        if (!res.closed) {
          res.write(
            `data: ${JSON.stringify({
              error: agentErr instanceof Error ? agentErr.message : 'Failed to generate response',
            })}\n\n`,
          );
          res.write(`data: [DONE]\n\n`);
          res.end();
        }
      }
    } catch (err) {
      console.error('[chat] error:', err);
      if (!res.closed) {
        res.write(
          `data: ${JSON.stringify({
            error: err instanceof Error ? err.message : 'Internal server error',
          })}\n\n`,
        );
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
      // Don't call next(err) for SSE errors as response is already sent
      void next;
    }
  },
);

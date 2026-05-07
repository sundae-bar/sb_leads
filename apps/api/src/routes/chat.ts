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
import { consumeCredits } from '../lib/billing.js';
import { meterAgentRun } from '@sundae/types';
import type { CoreMessage } from 'ai';

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

      // Gate on credits before doing any work. The pluggable meter (default 1
      // per call) lives in @sundae/types — change it there to switch
      // to token- or cost-based metering, and move this call to post-run.
      const cost = meterAgentRun({});
      const guard = await consumeCredits(tenantId, cost);
      if (!guard.ok) {
        res.write(
          `data: ${JSON.stringify({ error: 'out_of_credits', reason: guard.reason })}\n\n`,
        );
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }

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
      const coreMessages: CoreMessage[] = history.map((m) => ({
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
        const { text, totalTokens } = await runChatAgent({
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
          metadata: { totalTokens, model: 'gpt-5-mini' },
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

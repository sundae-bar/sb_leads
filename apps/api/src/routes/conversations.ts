import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
} from '../db/queries/conversations.js';
import { listMessages } from '../db/queries/messages.js';

export const conversationsRouter = Router();

// GET /api/v1/conversations
conversationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const conversations = await listConversations(req.supabase);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/conversations
conversationsRouter.post(
  '/',
  requireAuth,
  validate(z.object({ title: z.string().min(1).optional() })),
  async (req, res, next) => {
    try {
      const conversation = await createConversation(
        req.supabase,
        req.user.id,
        req.user.tenantId,
        req.body.title,
      );
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/conversations/:id
conversationsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const conversation = await getConversation(req.supabase, id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const messages = await listMessages(req.supabase, id);
    res.json({ ...conversation, messages });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/conversations/:id
conversationsRouter.put(
  '/:id',
  requireAuth,
  validate(z.object({ title: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const updated = await updateConversation(
        req.supabase,
        req.params.id as string,
        req.body.title,
      );
      if (!updated) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/conversations/:id
conversationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const ok = await deleteConversation(req.supabase, req.params.id as string);
    if (!ok) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

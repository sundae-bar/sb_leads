import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { listApiKeys, createApiKey, deleteApiKey } from '../db/queries/api-keys.js';

export const apiKeysRouter = Router();

// GET /api/v1/api-keys
apiKeysRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const apiKeys = await listApiKeys(req.supabase);
    const response = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPreview: key.keyPreview,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/api-keys
apiKeysRouter.post(
  '/',
  requireAuth,
  validate(
    z.object({
      name: z.string().min(1).max(255),
      expiryDays: z.number().int().positive().nullable().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { name, expiryDays } = req.body;

      let expiresAt: Date | null = null;
      if (expiryDays !== null && expiryDays !== undefined) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);
      }

      const { apiKey, fullKey } = await createApiKey(
        req.supabase,
        req.user.id,
        req.user.tenantId,
        name,
        expiresAt,
      );

      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: fullKey,
        keyPreview: apiKey.keyPreview,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/api-keys/:id
apiKeysRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const ok = await deleteApiKey(req.supabase, id);
    if (!ok) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

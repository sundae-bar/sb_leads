import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { ProviderError } from '../providers/types.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'invalid_request', issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err instanceof ProviderError) {
    logger.warn({ err, path: req.path }, 'provider error');
    res.status(502).json({ error: 'provider_error', provider: err.provider, message: err.message });
    return;
  }
  // Supabase PostgrestError — has .code and .message
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const pg = err as { code: string; message: string; details?: string; hint?: string };
    logger.error({ err: pg, path: req.path }, 'db error');
    res.status(500).json({ error: 'db_error', code: pg.code, message: pg.message, details: pg.details });
    return;
  }
  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({ error: 'internal_error' });
};

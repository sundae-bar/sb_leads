import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listAgentRuns, getAgentRun, listAgentRunSteps } from '../db/queries/traces.js';

const router = Router();

// GET /api/v1/traces
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, agentName, limit, offset } = req.query;
    const runs = await listAgentRuns(req.supabase, {
      status: status as string | undefined,
      agentName: agentName as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(runs);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/traces/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const run = await getAgentRun(req.supabase, id);
    if (!run) {
      res.status(404).json({ error: 'Trace not found' });
      return;
    }
    const steps = await listAgentRunSteps(req.supabase, id);
    res.json({ ...run, steps });
  } catch (err) {
    next(err);
  }
});

export { router as tracesRouter };

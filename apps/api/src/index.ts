import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './logger.js';
import { handleMcpRequest } from './mcp/server.js';
import { errorHandler } from './middleware/error.js';
import { requireLeadsAuth } from './middleware/requireLeadsAuth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { handleThe402Webhook } from './integrations/the402/webhook.js';
// Tenant routes (Supabase JWT auth)
import { chatRouter } from './routes/chat.js';
import { conversationsRouter } from './routes/conversations.js';
import { tracesRouter } from './routes/traces.js';
import { apiKeysRouter } from './routes/api-keys.js';
// Leads routes (dual JWT + API key auth)
import { findEmailRouter } from './routes/findEmail.js';
import { intentSignalsRouter } from './routes/intentSignals.js';
import { verifyEmailRouter } from './routes/verifyEmail.js';

const app = express();

app.use(cors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true }));
app.use(
  express.json({
    limit: '1mb',
    // Stash raw bytes on the request so HMAC-verified webhook handlers
    // (e.g. the402) can recompute the signature. Has no effect on routes
    // that don't need it.
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

// Health check (unauthenticated)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sundae', version: '0.0.1' });
});

// Tenant routes (Supabase JWT required)
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/traces', tracesRouter);
app.use('/api/v1/api-keys', apiKeysRouter);

// Rate limit the public lead-enrichment + MCP surface. Keyed by `req.ip`
// because auth runs AFTER this middleware — we shed load before doing any
// DB lookups. 60 req/min/IP is generous for legitimate use and tight enough
// to stop a runaway script from burning provider budgets.
const enrichmentLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyFn: (req) => req.ip,
  label: 'enrichment',
});

app.use('/find-email', enrichmentLimit);
app.use('/verify-email', enrichmentLimit);
app.use('/intent-signals', enrichmentLimit);
app.use('/mcp', enrichmentLimit);

// Leads enrichment routes (JWT or API key — auth inside each router)
app.use(findEmailRouter);
app.use(verifyEmailRouter);
app.use(intentSignalsRouter);

// MCP endpoint — Bearer token (API key or JWT). The chat agent uses a
// per-tenant managed API key so it talks to /mcp the same way an external
// integrator would.
app.post('/mcp', requireLeadsAuth, handleMcpRequest);
app.get('/mcp', requireLeadsAuth, handleMcpRequest);
app.delete('/mcp', requireLeadsAuth, handleMcpRequest);

// the402.ai webhook — HMAC-verified inside the handler, not behind requireLeadsAuth.
app.post('/the402/webhook', handleThe402Webhook);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'sundae api listening');
});

export default app;

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './logger.js';
import { handleMcpRequest } from './mcp/server.js';
import { errorHandler } from './middleware/error.js';
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
app.use(express.json({ limit: '1mb' }));

// Health check (unauthenticated)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sundae', version: '0.0.1' });
});

// Tenant routes (Supabase JWT required)
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/traces', tracesRouter);
app.use('/api/v1/api-keys', apiKeysRouter);

// Leads enrichment routes (JWT or API key — auth inside each router)
app.use(findEmailRouter);
app.use(verifyEmailRouter);
app.use(intentSignalsRouter);

// MCP endpoint
app.post('/mcp', handleMcpRequest);
app.get('/mcp', handleMcpRequest);
app.delete('/mcp', handleMcpRequest);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'sundae api listening');
});

export default app;

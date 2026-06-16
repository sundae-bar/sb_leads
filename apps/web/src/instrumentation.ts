// Next.js instrumentation hook — runs once at server startup, before any route
// handler or page renders.
//
// Our runtime is Node 20 (node:20-alpine), which has no global `WebSocket`.
// @supabase/realtime-js requires one when any Supabase client is constructed,
// so the @supabase/ssr server client (lib/supabase/server.ts, used by every
// authenticated route) — and any other client — would throw at construction.
// Install `ws` globally on the Node runtime so all clients work. No-op on
// Node 22+ (native WebSocket) or if something already set it.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as { WebSocket?: unknown };
    if (!g.WebSocket) {
      g.WebSocket = (await import('ws')).default;
    }
  }
}

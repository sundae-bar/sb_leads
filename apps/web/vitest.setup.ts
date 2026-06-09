// Node 20 (our prod + CI runtime) ships no global WebSocket, which
// @supabase/realtime-js requires when a Supabase client is constructed. App
// code passes `ws` as the realtime transport on each client; for test-created
// clients we install it on globalThis instead. No-op on Node 22+ (native WS).
import WebSocket from 'ws';

const g = globalThis as { WebSocket?: unknown };
if (!g.WebSocket) {
  g.WebSocket = WebSocket;
}

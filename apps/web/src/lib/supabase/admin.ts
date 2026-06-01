import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Node 20 (our runtime) has no global WebSocket; @supabase/realtime-js
      // throws at construction without one. Provide ws, matching the API clients.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      realtime: { transport: WebSocket as any },
    },
  );
}

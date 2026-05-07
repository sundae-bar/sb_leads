import type { AuthProvider } from './types';

let _provider: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (_provider) return _provider;

  const providerName = process.env.AUTH_PROVIDER ?? 'supabase';

  if (providerName === 'clerk') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClerkAuthProvider } = require('./clerk') as typeof import('./clerk');
    _provider = new ClerkAuthProvider();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseAuthProvider } = require('./supabase') as typeof import('./supabase');
    _provider = new SupabaseAuthProvider();
  }

  return _provider!;
}

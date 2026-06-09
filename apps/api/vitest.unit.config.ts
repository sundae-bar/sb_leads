import { defineConfig } from 'vitest/config';

// CI-friendly subset: every test EXCEPT the suites that require a live
// Supabase (SUPABASE_URL + service-role key). Those integration suites
// (tenancy, billing) still run via `pnpm test` locally where .env is present.
export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/tenancy.test.ts', '**/billing.test.ts'],
  },
});

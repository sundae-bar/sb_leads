import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Web tests are integration tests (they hit a live local Supabase). The `@`
// alias mirrors tsconfig's paths so route handlers import cleanly under vitest.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
});

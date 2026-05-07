import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      // Tests load the same root .env as the dev server.
    },
  },
});

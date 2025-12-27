import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 10000,
    include: ['packages/*/test/**/*.ts'],
    exclude: ['**/parse-all.ts'],
  },
});

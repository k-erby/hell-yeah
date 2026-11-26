import { defineConfig } from 'vitest/config';

// Unit tests live next to the code in src/. The Playwright tests in e2e/ run separately (npm run test:e2e).
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });

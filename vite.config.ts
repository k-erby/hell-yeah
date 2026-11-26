import { defineConfig } from 'vitest/config';

export default defineConfig({
  // './' so the build works from any sub-path (GitHub Pages, Netlify, etc.)
  base: './',
  // Unit tests live next to the code in src/. The phone tests in e2e/ run separately (npm run test:e2e).
  test: { include: ['src/**/*.test.ts'] },
});

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

/**
 * Mirrors the `@/*` -> `./src/*` mapping from tsconfig.json, so tests can import
 * modules the same way application code does. Without this, any test touching a
 * module that uses the alias fails to resolve it.
 *
 * `.mts` rather than `.ts` on purpose: vitest 0.34 loads a `.ts` config through
 * Vite's CJS Node API, which prints a deprecation warning on every run.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

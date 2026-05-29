import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx,js}'],
    // Component tests use @vitest-environment jsdom directive in-file
    environmentMatchGlobs: [
      ['tests/components/**', 'jsdom'],
    ],
    setupFiles: ['tests/setup-component.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.{ts,js}'],
      exclude: ['lib/providers/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});

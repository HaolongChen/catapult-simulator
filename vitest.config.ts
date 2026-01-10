import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Physics tests can be slow, increase timeout
    testTimeout: 60_000,
    slowTestThreshold: 5_000,

    // Performance thresholds for physics simulation
    benchmark: {
      include: ['**/*.{bench,test}.{ts,tsx}'],
      exclude: ['node_modules'],
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.bench.ts',
        'src/routes/',
        'src/main.tsx',
      ],
    },

    // Global setup for physics tests
    setupFiles: ['./src/__tests__/setup.ts'],

    // Use fake timers for deterministic testing
    fakeTimers: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

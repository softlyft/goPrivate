import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(root, 'apps/web/src'),
      '@goprivate/protocol': path.join(root, 'packages/protocol/src/index.ts'),
      '@goprivate/crypto': path.join(root, 'packages/crypto/src/index.ts'),
      '@goprivate/sdk': path.join(root, 'packages/sdk/src/index.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'apps/relay/src/**/*.test.ts',
      'apps/web/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: [
        'packages/protocol/src/**/*.ts',
        'packages/crypto/src/**/*.ts',
        'packages/sdk/src/**/*.ts',
        'apps/relay/src/**/*.ts',
        'apps/web/src/services/**/*.ts',
        'apps/web/src/utils/**/*.ts',
        'apps/web/src/store/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/types.ts',
        'packages/sdk/src/index.ts',
        'packages/crypto/src/index.ts',
        'apps/relay/src/index.ts',
        'apps/relay/src/websocket/**',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});

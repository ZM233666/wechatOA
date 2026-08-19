import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MOCK_DELAY_ENABLED: 'false',
      MOCK_DEFAULT_SCENARIO: 'normal',
      MOCK_PORT: '3100',
      MOCK_NOW: '2026-08-19T06:00:00.000Z',
    },
  },
});

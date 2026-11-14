import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Windows file notifications can miss edits, leaving transformed dependencies
  // stale while Game.ts is updated. Polling keeps the module graph coherent.
  server: { strictPort: true, watch: process.platform === 'win32' ? { usePolling: true, interval: 250 } : undefined },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000, maxWorkers: 2 },
});

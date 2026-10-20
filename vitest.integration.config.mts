import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests d'intégration : nécessitent `npx supabase start` (base locale).
export default defineConfig({
  test: { include: ["tests/integration/**/*.test.ts"], testTimeout: 30000, fileParallelism: false },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});

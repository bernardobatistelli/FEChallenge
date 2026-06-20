import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    // Pin the deterministic mock for unit tests so they never hit a real API,
    // even if the shell (or .env.local via `next dev`) exports AI_PROVIDER=openai.
    env: { AI_PROVIDER: "mock" },
    // PGlite + model streaming can take a moment on a cold start.
    testTimeout: 30_000,
  },
});

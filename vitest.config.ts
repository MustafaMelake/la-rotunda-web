import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pure/server-action specs run in `node`; a Zustand store spec opts into a DOM
// with a per-file `// @vitest-environment jsdom` pragma. The `@/*` alias mirrors
// tsconfig so imports resolve identically under test.
export default defineConfig({
  test: {
    environment: "node",
    // Forks avoid the intermittent "Vitest failed to find the runner" race that
    // worker threads hit on Windows single-file runs.
    pool: "forks",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // The scaffold ships with no specs yet, and vitest exits 1 on "no test files
    // found" — which would make the Stop-hook gate block every turn. Remove this
    // once the first spec lands (start with src/lib/pricing.ts, which is what
    // the coverage scope below already points at).
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      // Scope to the money path first so the number stays meaningful.
      include: ["src/lib/pricing.ts"],
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});

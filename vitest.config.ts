import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

// node_modules may be junction/symlink-linked to a sibling checkout (worktrees).
// Vite only serves files inside the project root; @testing-library/svelte's vitest
// setup resolves to the real path (outside the worktree root), so it must be allowed.
const realNodeModules = realpathSync(
  fileURLToPath(new URL("./node_modules", import.meta.url)),
);

export default defineConfig({
  plugins: [svelte({ hot: false }), svelteTesting()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      "$env/static/public": fileURLToPath(
        new URL("./src/test/env-static-public.ts", import.meta.url),
      ),
      "$app/forms": fileURLToPath(
        new URL("./src/test/app-forms.ts", import.meta.url),
      ),
      "$app/paths": fileURLToPath(
        new URL("./src/test/app-paths.ts", import.meta.url),
      ),
    },
  },
  server: {
    fs: {
      allow: [realNodeModules],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts", "./src/test/pm-polyfill.ts"],
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    css: false,
    mockReset: true,
  },
});

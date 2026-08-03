import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

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
      // node_modules is junction-linked to the main checkout (`../../RolErrante`)
      // so worktree test runs can resolve @testing-library and other packages.
      allow: ["..", "../RolErrante", "../../RolErrante/node_modules"],
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

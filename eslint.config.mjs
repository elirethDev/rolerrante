import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "svelte/no-navigation-without-resolve": "warn",
      "svelte/require-each-key": "warn",
      "svelte/no-at-html-tags": "warn",
    },
  },
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["node_modules/", ".svelte-kit/", "build/", ".vercel/", ".atl/"],
  },
);

# Contributing

Quality tooling for RolErrante: Vitest (tests), ESLint (lint), Prettier (format).

## Commands

| Command                | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm test`             | Run the Vitest suite once                 |
| `npm run test:watch`   | Run Vitest in watch mode                  |
| `npm run lint`         | ESLint over the project                   |
| `npm run format`       | Prettier write over the project           |
| `npm run format:check` | Prettier check (no writes)                |
| `npm run check`        | svelte-check (SvelteKit type diagnostics) |
| `npm run build`        | Production build                          |

## Lint Baseline

Warnings are allowed and tracked as a baseline so existing code can be
migrated incrementally. Errors are blocking.

- Baseline warnings: **84** (recorded 2026-07-31, first `npm run lint` after
  introducing the quality toolchain).
- Warnings SHALL NOT increase beyond this baseline without an explicit
  exception in the change proposal.
- Errors count: 0 required for a green `npm run lint`.

Current warning categories:

| Rule                                                   | Count | Notes                                      |
| ------------------------------------------------------ | ----- | ------------------------------------------ |
| `svelte/no-navigation-without-resolve`                 | ~40   | pre-existing links; migrate to `resolve()` |
| `svelte/require-each-key`                              | ~25   | pre-existing each blocks; add keys         |
| `no-undef` (`App` in server files)                     | ~11   | `App` namespace from SvelteKit, expected   |
| `no-unused-vars` / `@typescript-eslint/no-unused-vars` | ~6    | pre-existing dead code                     |
| `svelte/no-at-html-tags`                               | 2     | pre-existing `{@html}` usages              |
| `@typescript-eslint/no-explicit-any`                   | 1     | pre-existing `any`                         |

> **Note**: the three lint errors listed for `tests/rules.test.mjs` in the
> first run are transient — that legacy theater test was removed by the test
> migration. Post-migration `npm run lint` exits 0 with only warnings.

Prettier manages the project's own quality files (configs, tests, package
manifest). Product source under `src/` is intentionally excluded via
`.prettierignore` so formatting never rewrites application code without an
explicit change.

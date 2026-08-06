# Database schema — single source of truth

The database schema lives **only** in `supabase/migrations/*.sql`. There is no
hand-maintained schema dump in this repo (`docs/supabase-schema.sql` was removed
because it drifted from the migrations — the classic two-sources-of-truth bug
that the `tests/db-contract.test.ts` now guards against).

## What to trust

| Artifact | Role |
| --- | --- |
| `supabase/migrations/*.sql` | Authoritative. Append-only; every change to tables, RPCs, policies, triggers or grants is a new migration. |
| `src/lib/supabase/database.types.ts` | **Generated** from the live remote via `supabase gen types`. Never hand-edit it; if a column drifts, fix code against the real schema or re-run `gen:types`. |
| `tests/db-contract.test.ts` | Enforces the contract: every table / RPC referenced by app code and every typed function must exist in a migration. |

## Regenerating from the live project

Requirements: `supabase` CLI, logged-in session, and a valid `SUPABASE_ACCESS_TOKEN`.

```bash
# Re-sync local migrations db to the remote project (apply any new *.sql)
npm run db:sync

# Regenerate database.types.ts from the remote project
npm run gen:types
```

> `docs/supabase-schema.sql` is **not** authoritative. If you want a readable
> snapshot for reference, generate one (`supabase db dump --project-ref <ref>`)
> or just read the migrations — but do not commit a divergent copy again.
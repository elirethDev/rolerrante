import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * DB ↔ app contract — the anti-drift guard (RED-03).
 *
 * Every table and RPC the application references through PostgREST must actually
 * exist in supabase/migrations (the single source of truth), and every function
 * typed in database.types.ts must be migrated, so writing code against a
 * table/RPC/type that has no migration fails the suite statically.
 *
 * Pattern: the other migration tests (foro-categories-migration.test.ts etc.),
 * i.e. readFileSync + regex, no live Postgres.
 */
const ROOT = resolve(process.cwd());
const SRC_DIR = join(ROOT, "src");
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const TYPES_PATH = join(ROOT, "src/lib/supabase/database.types.ts");
const SCHEMA_EXPORT_PATH = join(ROOT, "docs/supabase-schema.sql");

/** Supabase Storage buckets are not Postgres tables but are reached via
 * supabase.from('<bucket>') for storage uploads — allow-list them. */
const STORAGE_BUCKETS = new Set(["avatars"]);

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const migrationsSql = migrations
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");

function walkSrcFiles(dir: string = SRC_DIR): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSrcFiles(p));
    else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".svelte")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts")
    )
      out.push(p);
  }
  return out;
}

const srcCode = walkSrcFiles()
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

function collect(pattern: RegExp, text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(pattern)) out.add(m[1]);
  return out;
}

/** Tables reached via supabase.from('<name>') anywhere in app code. */
const usedTables = collect(/\.from\(['"]([a-z_]+)['"]\)/g, srcCode);

/** RPC names called as string literals, plus the names the GM worklist resolves
 * into supabase.rpc(call.rpc, ...) at runtime. */
const usedRpc = new Set([
  ...collect(/\.rpc\(['"]([a-z_]+)['"]/g, srcCode),
  ...collect(/rpc:\s*['"]([a-z_]+)['"]/g, srcCode),
]);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function tableInMigrations(table: string): boolean {
  return new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.("?)${escape(table)}\\1`,
    "i",
  ).test(migrationsSql);
}

function rpcInMigrations(rpc: string): boolean {
  return new RegExp(
    `CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.("?)${escape(rpc)}\\1`,
    "i",
  ).test(migrationsSql);
}

function tableGaps(tables: Iterable<string>): string[] {
  return [...tables].filter((t) => !STORAGE_BUCKETS.has(t) && !tableInMigrations(t));
}

function rpcGaps(rpcs: Iterable<string>): string[] {
  return [...rpcs].filter((r) => !rpcInMigrations(r));
}

/** The `public: { ... }` section of the generated types file, brace-matched so
 * graphql_public (a built-in PgGraphQL schema) is never confused with it. */
function publicSchemaSection(types: string): string {
  const start = types.indexOf("  public: {");
  if (start < 0) throw new Error("database.types.ts: missing public schema");
  let depth = 0;
  for (let i = start; i < types.length; i++) {
    const ch = types[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return types.slice(start, i + 1);
    }
  }
  throw new Error("database.types.ts: unbalanced public schema");
}

/** Function names declared in the public Functions block of database.types.ts.
 * This is the "typed but never migrated" bug trap. */
function typedPublicFunctions(): string[] {
  const types = readFileSync(TYPES_PATH, "utf8");
  const publicSection = publicSchemaSection(types);
  const funcsIdx = publicSection.indexOf("    Functions: {");
  expect(funcsIdx, "database.types.ts must declare public Functions").toBeGreaterThan(-1);
  const closeIdx = publicSection.indexOf("\n    }", funcsIdx);
  const block = publicSection.slice(funcsIdx, closeIdx);
  return [...block.matchAll(/^\s{6}([a-z_]+): \{/gm)].map((m) => m[1]);
}

describe("db-contract: app references vs supabase/migrations", () => {
  it("every supabase.from('<table>') used in src is a migrated table or a storage bucket", () => {
    const missing = tableGaps(usedTables);
    expect(
      missing,
      `Tables referenced in src with no CREATE TABLE public.<t> in any migration (${migrations.join(", ")}): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every RPC used in src (literal + worklist-resolved) is a migrated function", () => {
    const missing = rpcGaps(usedRpc);
    expect(
      missing,
      `RPCs referenced in src with no CREATE (OR REPLACE) FUNCTION public.<rpc> in any migration: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every function typed in database.types.ts (public) is migrated — typed-and-migrated, never typed-only", () => {
    const missing = rpcGaps(typedPublicFunctions());
    expect(
      missing,
      `Functions declared in database.types.ts but with no migration definition: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("harness proof: a fake RPC / table with no migration is caught by the analyzers", () => {
    expect(tableGaps(["definitely_not_a_table"])).toContain("definitely_not_a_table");
    expect(rpcGaps(["definitely_not_an_rpc"])).toContain("definitely_not_an_rpc");
  });
});

describe("database.types.ts regeneration marker", () => {
  it("is the full generated schema, not a hand-pruned copy (graphql_public schema + reports table)", () => {
    const types = readFileSync(TYPES_PATH, "utf8");
    expect(types).toContain("  graphql_public: {");
    expect(types).toMatch(/^\s{6}reports: \{$/m);
  });

  it("types the full migrated RPC surface (delete any of these and the prune recurs)", () => {
    const fn = typedPublicFunctions();
    for (const rpc of [
      "ban_user",
      "change_role",
      "confirm_event_completion",
      "finalize_event",
      "reject_skill_request",
      "resolve_report",
      "suspend_user",
      "touch_presence",
    ]) {
      expect(fn, `regenerated types must type the ${rpc} RPC`).toContain(rpc);
    }
  });
});

// docs/supabase-schema.sql was a divergent hand-maintained record; the migrations
// are the source of truth. If the file is ever re-added, every migrated function
// must appear in it — otherwise the second source of truth drifts again.
const schemaExportExists = existsSync(SCHEMA_EXPORT_PATH);
it.runIf(schemaExportExists)(
  "docs/supabase-schema.sql (if kept) contains every migrated function",
  () => {
    const schema = readFileSync(SCHEMA_EXPORT_PATH, "utf8");
    const migrationFuncs = collect(
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_]+)/gi,
      migrationsSql,
    );
    const missing = [...migrationFuncs].filter(
      (f) => !new RegExp(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${escape(f)}`, "i").test(schema),
    );
    expect(
      missing,
      `Functions migrated but missing from docs/supabase-schema.sql: ${missing.join(", ")}`,
    ).toEqual([]);
  },
);
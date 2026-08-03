import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres, so we statically verify the
// moderation migration's security-critical bodies (the "applies on a clean DB"
// proxy): the reports INSERT reporter binding and the suspend_user timing
// guards enforced in the fault-tolerant review (CRITICAL 1 / WARNING 2 / 3).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260803000000_forum_moderation.sql",
);
const sql = readFileSync(migrationPath, "utf8");

function extractFunction(name: string): string {
  const match = sql.match(
    new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}[\\s\\S]*?\\n\\$\\$;`),
  );
  expect(match, `expected ${name} function body`).not.toBeNull();
  return match![0];
}

describe("forum moderation migration 20260803000000_forum_moderation.sql", () => {
  it("binds reports INSERT reporter_id to the caller (REQ-MOD-REP-01.3)", () => {
    // Any authenticated caller may report, but the report must be attributed to
    // the caller's own uid — never a caller-supplied arbitrary reporter.
    expect(sql).toMatch(
      /CREATE POLICY "Cualquier autenticado reporta" ON public\.reports[\s\S]*?FOR INSERT WITH CHECK \(reporter_id = auth\.uid\(\)\)/,
    );
    // The insecure blanket form must be gone.
    expect(sql).not.toMatch(
      /FOR INSERT WITH CHECK \(auth\.uid\(\) IS NOT NULL\)/,
    );
  });

  it("suspend_user rejects a NULL active_until (no silent no-op suspension)", () => {
    const fn = extractFunction("suspend_user");
    expect(fn).toMatch(/IF p_active_until IS NULL THEN[\s\S]*?RAISE EXCEPTION/);
  });

  it("suspend_user rejects an expired/past active_until (future-only)", () => {
    const fn = extractFunction("suspend_user");
    expect(fn).toMatch(
      /IF p_active_until <= now\(\) THEN[\s\S]*?RAISE EXCEPTION/,
    );
  });

  it("ban_user keeps permanent bans working (NULL active_until, no timing guard)", () => {
    const banFn = extractFunction("ban_user");
    // Bans must not inherit the suspension timing guard.
    expect(banFn).not.toMatch(/p_active_until/);
    expect(banFn).not.toMatch(/now\(\)/);
    expect(banFn).toMatch(/INSERT INTO public\.user_sanctions[\s\S]*?VALUES \(p_user_id, 'ban', NULL/);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment. We statically
// verify the community-presence migration is self-consistent with the required
// column, SECURITY DEFINER RPC and REVOKE/GRANT (the "applies on a clean DB"
// proxy, mirroring the log_audit pattern established in the init schema).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260804000000_community_presence.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("community presence migration 20260804000000_community_presence.sql", () => {
  it("adds a nullable last_active_at timestamptz column to profiles (REQ-CP-01)", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.profiles\s+ADD COLUMN IF NOT EXISTS last_active_at\s+timestamptz/i,
    );
    // nullable: no NOT NULL, no DEFAULT
    expect(sql).not.toMatch(
      /ADD COLUMN[\s\S]*?last_active_at[\s\S]*?NOT NULL/i,
    );
  });

  it("defines touch_presence() as SECURITY DEFINER with a scoped search_path (REQ-CP-01)", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.touch_presence()");
    expect(sql).toMatch(/LANGUAGE plpgsql SECURITY DEFINER/i);
    expect(sql).toContain("SET search_path = pg_catalog, pg_temp");
  });

  it("guards against anonymous calls and updates only the caller row (REQ-CP-01)", () => {
    expect(sql).toContain("IF auth.uid() IS NULL THEN");
    expect(sql).toMatch(/RAISE EXCEPTION 'No autorizado'/);
    expect(sql).toMatch(
      /UPDATE public\.profiles SET last_active_at = now\(\) WHERE id = auth\.uid\(\)/,
    );
  });

  it("mirrors the log_audit grant pattern: revoke public/anon, grant authenticated (REQ-CP-01)", () => {
    expect(sql).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.touch_presence\(\) FROM public, anon/i,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.touch_presence\(\) TO authenticated/i,
    );
  });

  it("does not widen the profiles UPDATE column grant (no ALTER default privileges / GRANT UPDATE)", () => {
    // The migration only touches the column + function; it must not GRANT UPDATE
    // on the profiles table to anyone.
    expect(sql).not.toMatch(/GRANT\s+UPDATE/i);
    expect(sql).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
  });

  it("provides a down-migration so the change is reversible", () => {
    expect(sql).toMatch(/Rollback \(down-migration\)/i);
    expect(sql).toMatch(/DROP FUNCTION public\.touch_presence\(\)/);
    expect(sql).toMatch(/DROP COLUMN IF EXISTS last_active_at/);
  });
});

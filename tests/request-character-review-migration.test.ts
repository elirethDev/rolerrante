import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment. We statically
// verify the request_character_review migration is self-consistent: the new
// audit_action enum value, the owner-scoped SECURITY DEFINER RPC and the
// REVOKE/GRANT (the "applies on a clean DB" proxy, mirroring the log_audit +
// community_presence pattern).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260804000001_request_character_review.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("request_character_review migration 20260804000001_request_character_review.sql", () => {
  it("extends audit_action with 'solicitar_revision' in the same migration", () => {
    expect(sql).toMatch(
      /ALTER TYPE public\.audit_action ADD VALUE IF NOT EXISTS 'solicitar_revision'/,
    );
  });

  it("defines request_character_review() as SECURITY DEFINER with a scoped search_path", () => {
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.request_character_review(p_character_id uuid)",
    );
    expect(sql).toMatch(/LANGUAGE plpgsql SECURITY DEFINER/i);
    expect(sql).toContain("SET search_path = pg_catalog, pg_temp");
  });

  it("guards against anonymous calls and non-owners", () => {
    expect(sql).toContain("IF auth.uid() IS NULL THEN");
    expect(sql).toMatch(/RAISE EXCEPTION 'No autorizado'/);
    // ownership check compares the character's player_id against auth.uid()
    expect(sql).toMatch(
      /SELECT player_id INTO v_player_id FROM public\.characters/,
    );
    expect(sql).toMatch(/IF v_player_id <> auth\.uid\(\) THEN/i);
    expect(sql).toMatch(/RAISE EXCEPTION 'No autorizado'/);
  });

  it("resets status to pendiente and clears the review trail", () => {
    expect(sql).toMatch(/SET status = 'pendiente'/);
    expect(sql).toMatch(/review_notes = NULL/);
    expect(sql).toMatch(/reviewed_by = NULL/);
    expect(sql).toMatch(/reviewed_at = NULL/);
  });

  it("mirrors the log_audit grant pattern: revoke public/anon, grant authenticated", () => {
    expect(sql).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.request_character_review\(uuid\) FROM public, anon/i,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.request_character_review\(uuid\) TO authenticated/i,
    );
  });

  it("does not widen the characters UPDATE column grant (no ALTER default privileges / GRANT UPDATE)", () => {
    expect(sql).not.toMatch(/GRANT\s+UPDATE/i);
    expect(sql).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
  });

  it("provides a down-migration so the change is reversible", () => {
    expect(sql).toMatch(/Rollback \(down-migration\)/i);
    expect(sql).toMatch(
      /DROP FUNCTION public\.request_character_review\(uuid\)/,
    );
  });
});

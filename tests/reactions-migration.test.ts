import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the reactions migration file is self-consistent with the required DDL,
// PK constraint, RLS policies and index (the "applies on a clean DB" proxy).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260802000001_reactions.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("reactions migration 20260802000001_reactions.sql", () => {
  it("defines the reactions table with PK (post_id, user_id) and RLS enabled (REACT-01.1)", () => {
    expect(sql).toContain("CREATE TABLE public.reactions");
    expect(sql).toMatch(/post_id\s+uuid\s+NOT NULL\s+REFERENCES public\.posts\s*\(id\)/);
    expect(sql).toMatch(/user_id\s+uuid\s+NOT NULL\s+REFERENCES public\.profiles\s*\(id\)/);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT NULL\s+DEFAULT now\(\)/);
    expect(sql).toMatch(/PRIMARY KEY\s*\(\s*post_id\s*,\s*user_id\s*\)/);
    expect(sql).toContain("ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;");
  });

  it("allows a user to INSERT only their own reaction row (REACT-01.1)", () => {
    const insertPolicy =
      /CREATE POLICY ".*?" ON public\.reactions[\s\S]*?FOR INSERT WITH CHECK \((.*?)\);/s.exec(
        sql,
      );
    expect(insertPolicy).not.toBeNull();
    expect(insertPolicy![1]).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
  });

  it("allows a user to DELETE only their own reaction row (REACT-01.1)", () => {
    const deletePolicy =
      /CREATE POLICY ".*?" ON public\.reactions[\s\S]*?FOR DELETE USING \((.*?)\);/s.exec(
        sql,
      );
    expect(deletePolicy).not.toBeNull();
    expect(deletePolicy![1]).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
  });

  it("restricts SELECT to posts within visible threads (view-scoped count, REACT-01.1)", () => {
    const selectPolicy =
      /CREATE POLICY ".*?" ON public\.reactions[\s\S]*?FOR SELECT USING \((.*?)\);/s.exec(
        sql,
      );
    expect(selectPolicy).not.toBeNull();
    const body = selectPolicy![1];
    // counts are view-scoped: only for posts inside threads the viewer can see.
    // Guests must still read counts (REQ-02.3 guest sees count chip), so the
    // policy is visibility-gated, NOT authenticated-only (unlike INSERT/DELETE).
    expect(body).toMatch(/EXISTS/);
    expect(body).toMatch(/threads/);
    expect(body).toMatch(/status\s+IN\s*\(\s*'aprobado'\s*,\s*'abierto'\s*\)/);
    // no leak of reaction data from pendiente/borrador threads
    expect(body).not.toMatch(/pendiente/);
    expect(body).not.toMatch(/borrador/);
  });

  it("creates an index for count aggregation by post (REACT-01.1)", () => {
    expect(sql).toMatch(
      /CREATE INDEX idx_reactions_post_id ON public\.reactions\(post_id\)/,
    );
  });
});

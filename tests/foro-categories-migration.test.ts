import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the foro-categories migration file adds the two new columns on
// public.categories with the right nullability/defaults (the "applies on a clean
// and on an existing DB" proxy).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805000000_foro_categories.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("foro-categories migration 20260805000000_foro_categories.sql", () => {
  it("adds a nullable min_read_role column of type user_role (FORO-CAT-MINROLE)", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.categories\s+ADD COLUMN\s+min_read_role\s+user_role/,
    );
  });

  it("adds a requires_approval boolean column defaulting to false (FORO-CAT-APPR)", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.categories\s+ADD COLUMN\s+requires_approval\s+boolean\s+NOT NULL\s+DEFAULT\s+false/,
    );
  });

  it("keeps existing rows readable by defaulting min_read_role to NULL", () => {
    // The ADD COLUMN must not specify a default for min_read_role (NULL = Público).
    expect(sql).not.toMatch(/min_read_role.+DEFAULT/);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment. We statically
// verify the terms-consent migration is self-consistent: nullable consent
// column added to profiles, the signup trigger re-created (append-only init
// schema untouched) to capture consent from auth metadata, and NO widening of
// the profiles UPDATE column grant (users must not backdate/clear consent).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805030000_terms_consent.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("terms consent migration 20260805030000_terms_consent.sql", () => {
  it("adds a nullable terms_accepted_at timestamptz column to profiles (REQ-AUTH terms)", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.profiles\s+ADD COLUMN terms_accepted_at\s+timestamptz/i,
    );
    // nullable: no NOT NULL and no DEFAULT on the ADD COLUMN
    expect(sql).not.toMatch(
      /ADD COLUMN[\s\S]*?terms_accepted_at[\s\S]*?NOT NULL/i,
    );
    expect(sql).not.toMatch(
      /ADD COLUMN[\s\S]*?terms_accepted_at[\s\S]*?DEFAULT/i,
    );
  });

  it("re-creates handle_new_user() inserting terms_accepted_at from auth metadata", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user()");
    expect(sql).toMatch(/INSERT INTO public\.profiles[\s\S]*?terms_accepted_at/);
    expect(sql).toMatch(
      /NEW\.raw_user_meta_data->>'terms_accepted_at'/i,
    );
  });

  it("re-creates the on_auth_user_created trigger after replacing the function", () => {
    expect(sql).toContain("DROP TRIGGER IF EXISTS on_auth_user_created");
    expect(sql).toMatch(
      /CREATE TRIGGER on_auth_user_created[\s\S]*?EXECUTE FUNCTION public\.handle_new_user\(\)/i,
    );
  });

  it("does not widen the profiles UPDATE column grant (consent is write-once)", () => {
    expect(sql).not.toMatch(
      /GRANT\s+UPDATE[^;]*terms_accepted_at/i,
    );
  });

  it("provides a down-migration so the change is reversible", () => {
    expect(sql).toMatch(/Rollback \(down-migration\)/i);
    expect(sql).toMatch(/DROP COLUMN IF EXISTS terms_accepted_at/);
  });
});

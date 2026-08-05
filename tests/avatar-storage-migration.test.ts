import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres / Supabase Storage in this
// environment. We statically verify the avatar_storage migration is
// self-consistent: the public `avatars` bucket, the size/mime backstops, the
// owner-scoped storage.objects policies and the down-migration (the "applies on
// a clean DB" proxy, mirroring the established migration test pattern).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805000001_avatar_storage.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("avatar_storage migration 20260805000001_avatar_storage.sql", () => {
  it("creates an avatars bucket marked public (REQ-AVUP-04)", () => {
    expect(sql).toMatch(/INSERT\s+INTO\s+storage\.buckets/i);
    expect(sql).toMatch(/'avatars'/);
    expect(sql).toMatch(/public\s*=\s*true/i);
  });

  it("sets a storage-level size backstop above the 150KB app cap (REQ-AVUP-02/03)", () => {
    // Bucket-level file_size_limit is a defense-in-depth backstop; the app
    // itself caps at AVATAR_MAX_BYTES (150_000) BEFORE upload.
    expect(sql).toMatch(/file_size_limit\s*=/i);
    expect(sql).toMatch(/250000/);
  });

  it("restricts stored mimetypes to webp as a backstop (REQ-AVUP-03)", () => {
    expect(sql).toMatch(/allowed_mime_types/i);
    expect(sql).toMatch(/'image\/webp'/);
  });

  it("grants public read on the avatars bucket objects (REQ-AVUP-04)", () => {
    expect(sql).toMatch(/CREATE POLICY/i);
    expect(sql).toMatch(/storage\.objects/i);
    expect(sql).toMatch(/bucket_id\s*=\s*'avatars'/i);
    expect(sql).toMatch(/FOR\s+SELECT/i);
    expect(sql).toMatch(/TO\s+(anon|public)/i);
  });

  it("scopes profile writes to the owner prefix avatars/{user_id}/ (REQ-AVUP-04)", () => {
    expect(sql).toMatch(/FOR\s+(INSERT|ALL)/i);
    expect(sql).toMatch(/storage\.foldername\(name\)/i);
    expect(sql).toMatch(/'avatars'/i);
    expect(sql).toMatch(/auth\.uid\(\)::text/i);
  });

  it("scopes character writes to char-avatars/{character_id}/ owned by the caller (REQ-AVUP-04)", () => {
    expect(sql).toMatch(/storage\.foldername\(name\)/i);
    expect(sql).toMatch(/'char-avatars'/i);
    expect(sql).toMatch(/public\.characters/i);
    expect(sql).toMatch(/player_id/i);
    expect(sql).toMatch(/auth\.uid\(\)/i);
  });

  it("does not widen the characters/profiles UPDATE column grant", () => {
    expect(sql).not.toMatch(/GRANT\s+UPDATE/i);
    expect(sql).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
  });

  it("provides a down-migration so the change is reversible", () => {
    expect(sql).toMatch(/Rollback \(down-migration\)/i);
    expect(sql).toMatch(/DROP POLICY/i);
    expect(sql).toMatch(/storage\.buckets/i);
  });
});

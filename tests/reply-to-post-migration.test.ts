import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment. We statically
// verify the reply-to migration is self-consistent: the nullable reply_to_post_id
// column is added to posts (self-FK with ON DELETE SET NULL so the chip drops
// when the target post vanishes) and the lookup index for the PostgREST embed
// reply_to:reply_to_post_id(...) is created. No new RLS policy: the existing
// posts SELECT policy already keys off the thread, and a reply target only
// resolves when its own thread is visible.
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805040000_reply_to_post.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("reply-to-post migration 20260805040000_reply_to_post.sql", () => {
  it("adds a nullable reply_to_post_id uuid column to posts referencing posts(id) ON DELETE SET NULL", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.posts\s+ADD COLUMN reply_to_post_id\s+uuid\s+REFERENCES public\.posts\(id\)\s+ON DELETE SET NULL/i,
    );
    // nullable: no NOT NULL on the ADD COLUMN
    expect(sql).not.toMatch(
      /ADD COLUMN[\s\S]*?reply_to_post_id[\s\S]*?NOT NULL/i,
    );
  });

  it("creates the reply-to lookup index idx_posts_reply_to", () => {
    expect(sql).toMatch(
      /CREATE INDEX idx_posts_reply_to\s+ON public\.posts\s*\(reply_to_post_id\)/i,
    );
  });
});

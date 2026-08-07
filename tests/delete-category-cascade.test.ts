import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805060000_delete_category_cascade.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("delete_category_cascade 20260805060000", () => {
  it("defines the SECURITY DEFINER cascade RPC, admin-gated", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.delete_category_cascade\(p_category_id uuid\)/,
    );
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/IF NOT public\.is_admin\(\) THEN/);
  });

  it("deletes threads of the category and its descendants before the categories", () => {
    // Orden correcto: primero threads (cascade posts/notifs), luego hijas, luego raíz.
    const threadIdx = sql.indexOf("DELETE FROM public.threads WHERE category_id = ANY");
    const childIdx = sql.indexOf("DELETE FROM public.categories WHERE parent_id = ANY");
    const rootIdx = sql.indexOf("DELETE FROM public.categories WHERE id = p_category_id");
    expect(threadIdx).toBeGreaterThan(-1);
    expect(threadIdx).toBeLessThan(childIdx);
    expect(childIdx).toBeLessThan(rootIdx);
  });

  it("collects descendants recursively via parent_id", () => {
    expect(sql).toMatch(/WITH RECURSIVE tree AS/);
    expect(sql).toMatch(/JOIN tree t ON c\.parent_id = t\.id/);
  });

  it("revokes public/anon and grants authenticated", () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.delete_category_cascade\(uuid\) FROM public, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.delete_category_cascade\(uuid\) TO authenticated;/);
  });
});

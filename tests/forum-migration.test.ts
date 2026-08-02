import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the migration file is self-consistent with the required DDL, RLS bodies,
// enum extension and indexes (the "applies on a clean DB" proxy).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260802000000_forum.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const TARGET_TABLES = [
  "categories",
  "threads",
  "posts",
  "section_permissions",
  "thread_permissions",
];

const AUDIT_ACTIONS = [
  "crear_hilo",
  "editar_post",
  "eliminar_post",
  "bloquear_hilo",
  "desbloquear_hilo",
  "editar_permisos",
];

describe("forum migration 20260802000000_forum.sql", () => {
  it("defines all five forum tables with RLS enabled (REQ-FORUM-01.1)", () => {
    for (const table of TARGET_TABLES) {
      expect(sql).toContain(`CREATE TABLE public.${table}`);
      expect(sql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
      );
    }
  });

  it("keeps audit_action extension in the SAME single migration (REQ-FORUM-01.2)", () => {
    // The forum migration must be the only file that mentions these actions.
    expect(sql).toMatch(/ALTER TYPE public\.audit_action/);
    for (const action of AUDIT_ACTIONS) {
      expect(sql).toMatch(new RegExp(`ADD VALUE IF NOT EXISTS '${action}'`));
    }
  });

  it("threads are 2-level with parent_id nullable and linked_entity hooks", () => {
    expect(sql).toMatch(
      /parent_id\s+uuid\s+REFERENCES public\.categories\s*\(id\)/,
    );
    expect(sql).toMatch(
      /content_type\s+text\s+NOT NULL\s+CHECK\s*\(content_type\s+IN\s*\(\s*'debate'\s*,\s*'historia'\s*,\s*'ficha'\s*,\s*'evento'\s*\)\)/s,
    );
    expect(sql).toMatch(/linked_entity_type\s+text/);
    expect(sql).toMatch(/linked_entity_id\s+uuid/);
  });

  it("threads SELECT leaks no pending rows to guests (REQ-FORUM-01.3 RED case)", () => {
    const selectPolicy =
      /CREATE POLICY "Threads visibles si abiertos o aprobados".*?FOR SELECT USING \((.*?)\);/s.exec(
        sql,
      );
    expect(selectPolicy).not.toBeNull();
    const body = selectPolicy![1];
    expect(body).toMatch(/status IN \('aprobado',\s*'abierto'\)/);
    expect(body).toMatch(/author_id = auth\.uid\(\)/);
    expect(body).toMatch(/is_gm_or_admin\(\)/);
    // The guest-visible clause must NOT grant access to pending/borrador threads.
    expect(body).not.toMatch(/pendiente/);
    expect(body).not.toMatch(/borrador/);
  });

  it("posts SELECT only exposes posts whose thread is visible (REQ-FORUM-01.3)", () => {
    const postPolicy =
      /CREATE POLICY "Posts visibles según hilo".*?FOR SELECT USING \((.*?)\);/s.exec(
        sql,
      );
    expect(postPolicy).not.toBeNull();
    expect(postPolicy![1]).toMatch(/EXISTS/);
    expect(postPolicy![1]).toMatch(/threads/);
    expect(postPolicy![1]).toMatch(/status IN \('aprobado',\s*'abierto'\)/);
  });

  it("thread and post writes are owner or GM/admin gated (REQ-FORUM-01.3)", () => {
    // threads ALL policy
    expect(sql).toMatch(
      /CREATE POLICY "Autor o GM\/Admin gestionan hilos"[.\s\S]*?FOR ALL USING \(author_id = auth\.uid\(\) OR is_gm_or_admin\(\)\)/,
    );
    // posts ALL policy
    expect(sql).toMatch(
      /CREATE POLICY "Autor o GM\/Admin gestionan posts"[.\s\S]*?FOR ALL USING \(author_id = auth\.uid\(\) OR is_gm_or_admin\(\)\)/,
    );
  });

  it("categories and permission tables are read-all / write-admin (REQ-FORUM-01.3)", () => {
    for (const table of [
      "categories",
      "section_permissions",
      "thread_permissions",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `CREATE POLICY ".*?" ON public\\.${table}[\\s\\S]*?FOR SELECT USING \\(true\\)`,
        ),
      );
      expect(sql).toMatch(
        new RegExp(
          `CREATE POLICY ".*?" ON public\\.${table}[\\s\\S]*?FOR ALL USING \\(EXISTS \\(SELECT 1 FROM public\\.profiles WHERE id = auth\\.uid\\(\\) AND role = 'admin'\\)\\)`,
        ),
      );
    }
  });

  it("creates the required indexes (REQ-FORUM-01.4)", () => {
    expect(sql).toMatch(
      /CREATE INDEX idx_threads_category_status ON public\.threads\(category_id, status\)/,
    );
    expect(sql).toMatch(
      /CREATE INDEX idx_threads_linked_entity ON public\.threads\(linked_entity_type, linked_entity_id\)/,
    );
    expect(sql).toMatch(
      /CREATE INDEX idx_posts_thread_number ON public\.posts\(thread_id, post_number\)/,
    );
  });
});

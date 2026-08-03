import { describe, expect, it } from "vitest";
import { Constants, type Database } from "../src/lib/supabase/database.types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// RED test (REQ-FORUM-01.5): forum interfaces must exist in database.types.ts.
// The typed fixtures below are compile-time guarantees: if a table/column is
// absent or mis-typed, `npm run check` fails. Runtime assertions cover the
// Constants enum maps and the presence of table keys.

describe("regenerated forum types", () => {
  it("surfaces all five forum table keys in the Database type", () => {
    expectTypeExistence("categories");
    expectTypeExistence("threads");
    expectTypeExistence("posts");
    expectTypeExistence("section_permissions");
    expectTypeExistence("thread_permissions");
  });

  it("types the threads row with linked-entity and moderation columns", () => {
    // Compile-time: must satisfy Row<"threads"> exactly (field names + types).
    const thread: Row<"threads"> = {
      id: "thread-1",
      category_id: null,
      content_type: "debate",
      title: "Título",
      body: {},
      author_id: "user-1",
      linked_entity_type: null,
      linked_entity_id: null,
      status: "abierto",
      is_locked: false,
      locked_by: null,
      locked_at: null,
      created_at: "2026-08-02T00:00:00Z",
      updated_at: "2026-08-02T00:00:00Z",
      edited_by: null,
      edited_at: null,
    };
    expect(thread.content_type).toBe("debate");
    expect(thread.status).toBe("abierto");
  });

  it("types section_permissions boolean flags", () => {
    const section: Row<"section_permissions"> = {
      category_id: "cat-1",
      role: "rolero",
      can_view: true,
      can_post: true,
      can_edit: false,
      can_lock: false,
      created_at: "2026-08-02T00:00:00Z",
      updated_at: "2026-08-02T00:00:00Z",
    };
    expect(section.can_view).toBe(true);
    expect(section.can_lock).toBe(false);
  });

  it("extends the audit_action enum with forum actions (REQ-FORUM-01.2)", () => {
    expect(Constants.public.Enums.audit_action).toEqual(
      expect.arrayContaining([
        "crear_hilo",
        "editar_post",
        "eliminar_post",
        "bloquear_hilo",
        "desbloquear_hilo",
        "editar_permisos",
      ]),
    );
  });

  it("registers the thread_status enum in Constants", () => {
    expect(Constants.public.Enums.thread_status).toContain("abierto");
    expect(Constants.public.Enums.thread_status).toContain("aprobado");
  });

  // Compile-time guard: referencing a non-existent table key fails `npm run check`.
  function expectTypeExistence<T extends keyof Database["public"]["Tables"]>(
    _table: T,
  ): void {
    expect(_table).toBeTruthy();
  }
});

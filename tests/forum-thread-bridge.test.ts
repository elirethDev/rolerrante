import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { getOrCreateThread, type ThreadEntityType } from "../src/lib/forum";

type ThreadRow = Database["public"]["Tables"]["threads"]["Row"];

interface EntityMock {
  table: string;
  title: string;
  status: string;
  body: Record<string, unknown>;
}

// Fluent fake covering the supabase chains getOrCreateThread uses:
//  threads:  .select().eq().eq().maybeSingle()   -> existing? ; .insert().select().single()
//  entity:   .select().eq().single()             -> underlying entity approval
function makeSupabase(entities: Record<ThreadEntityType, EntityMock>) {
  const threads: ThreadRow[] = [];
  const from = vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => {
        if (table !== "threads") return { data: null };
        return { data: threads[0] ?? null };
      }),
      single: vi.fn(async () => {
        if (table === "threads")
          return { data: threads[threads.length - 1] ?? null, error: null };
        const entity = Object.values(entities).find((e) => e.table === table);
        return { data: entity ?? null, error: null };
      }),
      insert: vi.fn((row: Partial<ThreadRow>) => {
        if (table === "threads") {
          threads.push({
            id: "thread-1",
            category_id: null,
            content_type: row.content_type ?? "historia",
            title: row.title ?? "",
            body: row.body ?? {},
            author_id: row.author_id ?? "",
            linked_entity_type: row.linked_entity_type ?? null,
            linked_entity_id: row.linked_entity_id ?? null,
            status: row.status ?? "pendiente",
            is_locked: row.is_locked ?? false,
            locked_by: null,
            locked_at: null,
            created_at: "2026-08-02T00:00:00Z",
            updated_at: "2026-08-02T00:00:00Z",
            edited_by: null,
            edited_at: null,
            ...row,
          });
        }
        return builder;
      }),
    };
    return builder;
  });
  return { from, threads };
}

// RED test (REQ-FORUM-03.1/05.2): lazy bridge creates on first call, returns
// the same thread on subsequent calls.
describe("getOrCreateThread", () => {
  it("creates an 'aprobado' thread for an approved story on first call", async () => {
    const supabase = makeSupabase({
      story: {
        table: "stories",
        title: "Mi historia",
        status: "aprobado",
        body: { type: "doc" },
      },
      character: {
        table: "characters",
        title: "Personaje",
        status: "aprobado",
        body: {},
      },
      event: {
        table: "events",
        title: "Evento",
        status: "publicado",
        body: {},
      },
    }) as unknown as SupabaseClient<Database>;

    const first = await getOrCreateThread(
      "story",
      "story-1",
      "user-1",
      supabase,
    );
    expect(first.created).toBe(true);
    expect(first.thread.linked_entity_type).toBe("story");
    expect(first.thread.linked_entity_id).toBe("story-1");
    expect(first.thread.status).toBe("aprobado");
    expect(first.thread.content_type).toBe("historia");
  });

  it("returns the existing thread (created=false) on a second call", async () => {
    const supabase = makeSupabase({
      story: {
        table: "stories",
        title: "Mi historia",
        status: "aprobado",
        body: { type: "doc" },
      },
      character: {
        table: "characters",
        title: "Personaje",
        status: "aprobado",
        body: {},
      },
      event: {
        table: "events",
        title: "Evento",
        status: "publicado",
        body: {},
      },
    }) as unknown as SupabaseClient<Database>;

    await getOrCreateThread("story", "story-1", "user-1", supabase);
    const second = await getOrCreateThread(
      "story",
      "story-1",
      "user-1",
      supabase,
    );
    expect(second.created).toBe(false);
    expect(second.thread.id).toBe("thread-1");
  });

  it("maps a pending subset entity to a non-public thread status", async () => {
    const supabase = makeSupabase({
      story: {
        table: "stories",
        title: "Mi historia",
        status: "pendiente",
        body: {},
      },
      character: {
        table: "characters",
        title: "Personaje",
        status: "aprobado",
        body: {},
      },
      event: {
        table: "events",
        title: "Evento",
        status: "publicado",
        body: {},
      },
    }) as unknown as SupabaseClient<Database>;

    const result = await getOrCreateThread(
      "story",
      "story-pending",
      "user-1",
      supabase,
    );
    expect(result.created).toBe(true);
    expect(result.thread.status).toBe("pendiente");
  });
});

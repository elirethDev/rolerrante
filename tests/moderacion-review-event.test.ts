/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { actions } from "../src/routes/admin/moderacion/+page.server";

// Focused unit tests for the fixed reviewEvent action (Bug 3, REQ-FORUM-05.3):
// an event is already finalized by finalize_event (XP awarded there), so
// reviewEvent must ONLY approve the bridged thread for public visibility —
// it must never call the XP-awarding confirm_event_completion again.
const act = (name: string) =>
  (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface ThreadRow {
  id: string;
  status: string;
  content_type: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  author_id: string;
}

interface Fixture {
  thread?: ThreadRow | null;
  eventStatus?: string;
  updateError?: { message: string } | null;
}

function makeSupabase(fixture: Fixture = {}) {
  const calls: { update: unknown[]; rpc: { name: string; args: unknown }[] } = {
    update: [],
    rpc: [],
  };
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      order: vi.fn(() => b),
      limit: vi.fn(() => b),
      update: vi.fn((row: unknown) => {
        calls.update.push(row);
        return b;
      }),
      maybeSingle: vi.fn(async () => ({
        data: table === "threads" ? (fixture.thread ?? null) : null,
        error: null,
      })),
      single: vi.fn(async () => ({
        data:
          table === "events"
            ? { id: fixture.thread?.linked_entity_id, status: fixture.eventStatus }
            : null,
        error: null,
      })),
      then: (res: (...a: unknown[]) => void, rej: (...a: unknown[]) => void) => {
        const out = fixture.updateError
          ? { data: null, error: fixture.updateError }
          : { data: [], error: null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return b;
  });
  const rpc = vi.fn(async (name: string, args: unknown) => {
    calls.rpc.push({ name, args });
    return { data: null, error: null };
  });
  return { from, rpc, calls };
}

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  role: "rolero" | "gm" | "admin" = "gm",
  id = "gm-1",
) => ({ supabase, user: { id }, profile: { id, role } }) as never;

const makeEvent = (
  locals: ReturnType<typeof makeLocals>,
  body = "threadId=t1",
) =>
  ({
    locals,
    request: new Request("http://localhost/admin/moderacion", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }),
  }) as unknown as RequestEvent;

const expectError = (fn: () => Promise<unknown>, status: number) =>
  fn().then(
    () => {
      throw new Error("expected an http-error to be thrown");
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(status);
    },
  );

const eventThread = (over: Partial<ThreadRow> = {}): ThreadRow => ({
  id: "t1",
  status: "pendiente",
  content_type: "evento",
  linked_entity_type: "event",
  linked_entity_id: "ev-1",
  author_id: "author-1",
  ...over,
});

describe("admin/moderacion reviewEvent (REQ-FORUM-05.3, Bug 3)", () => {
  it("approves the bridged thread when the event is finalized, WITHOUT re-awarding XP", async () => {
    const supabase = makeSupabase({ thread: eventThread(), eventStatus: "finalizado" });
    const res = (await act("reviewEvent")(makeEvent(makeLocals(supabase)))) as {
      success: boolean;
    };
    expect(res.success).toBe(true);
    expect((supabase.calls.update[0] as { status: string }).status).toBe("aprobado");
    expect(supabase.calls.rpc).toHaveLength(0);
  });

  it("never calls confirm_event_completion (XP is awarded once by finalize_event)", async () => {
    const supabase = makeSupabase({ thread: eventThread(), eventStatus: "finalizado" });
    await act("reviewEvent")(makeEvent(makeLocals(supabase)));
    const conf = supabase.calls.rpc.find(
      (r) => r.name === "confirm_event_completion",
    );
    expect(conf).toBeUndefined();
  });

  it("blocks review when the event is NOT finalized (no thread flip, no RPC)", async () => {
    const supabase = makeSupabase({ thread: eventThread(), eventStatus: "en_curso" });
    const res = (await act("reviewEvent")(makeEvent(makeLocals(supabase)))) as {
      status: number;
    };
    expect(res.status).toBe(400);
    expect(supabase.calls.update).toHaveLength(0);
    expect(supabase.calls.rpc).toHaveLength(0);
  });

  it("rejects a thread that is not a bridged event", async () => {
    const supabase = makeSupabase({
      thread: eventThread({ content_type: "historia", linked_entity_type: "story" }),
      eventStatus: "finalizado",
    });
    const res = (await act("reviewEvent")(makeEvent(makeLocals(supabase)))) as {
      status: number;
    };
    expect(res.status).toBe(400);
    expect(supabase.calls.update).toHaveLength(0);
  });

  it("throws 404 when the thread does not exist", async () => {
    const supabase = makeSupabase({ thread: null });
    await expectError(
      () => act("reviewEvent")(makeEvent(makeLocals(supabase))),
      404,
    );
  });

  it("throws 403 for a non-staff member", async () => {
    const supabase = makeSupabase({ thread: eventThread(), eventStatus: "finalizado" });
    await expectError(
      () => act("reviewEvent")(makeEvent(makeLocals(supabase, "rolero", "r1"))),
      403,
    );
  });

  it("surfaces a thread update failure as a 400", async () => {
    const supabase = makeSupabase({
      thread: eventThread(),
      eventStatus: "finalizado",
      updateError: { message: "permission denied" },
    });
    const res = (await act("reviewEvent")(makeEvent(makeLocals(supabase)))) as {
      status: number;
      data: { message: string };
    };
    expect(res.status).toBe(400);
    expect(res.data.message).toBe("permission denied");
  });
});

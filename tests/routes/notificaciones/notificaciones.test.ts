/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { load, actions } from "../../../src/routes/notificaciones/+page.server";

// Cast the SvelteKit-typed exports to loose versions for direct unit driving
// with the mocked event/locals (same pattern as tests/routes/admin/*).
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
const act = (name: string) =>
  (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface NotifFixture {
  notifications?: unknown[];
  error?: unknown;
  updateError?: unknown;
}

// Minimal chainable supabase mock covering the /notificaciones flows:
//  load:      notifications.select().eq('user_id').order('created_at')
//  markRead:  notifications.update({read_at}).eq('user_id').is('read_at', null)
function makeSupabase(fixture: NotifFixture = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {
      select: (...a: unknown[]) => {
        calls.push({ table, method: "select", args: a });
        return chain;
      },
      eq: (...a: unknown[]) => {
        calls.push({ table, method: "eq", args: a });
        return chain;
      },
      order: (...a: unknown[]) => {
        calls.push({ table, method: "order", args: a });
        return chain;
      },
      update: (v: unknown) => {
        calls.push({ table, method: "update", args: [v] });
        return chain;
      },
      is: (...a: unknown[]) => {
        calls.push({ table, method: "is", args: a });
        return chain;
      },
      then: (res: (r: unknown) => void, rej: (r: unknown) => void) => {
        const updateCalled = calls.some((c) => c.method === "update");
        if (updateCalled && fixture.updateError)
          return rej(fixture.updateError);
        return res({
          data: fixture.notifications ?? null,
          error: fixture.error ?? null,
        });
      },
    };
    return chain;
  });
  return { from, calls };
}

const NOTIF_ROWS = [
  {
    id: "n1",
    type: "new_reply",
    thread_id: "t1",
    post_id: "p1",
    actor_id: "u2",
    read_at: null,
    created_at: "2026-08-03T10:00:00Z",
    actor: { id: "u2", display_name: "Bruno", username: "bruno" },
    thread: { id: "t1", title: "El foro de pruebas" },
  },
  {
    id: "n2",
    type: "new_reply",
    thread_id: "t2",
    post_id: "p2",
    actor_id: "u3",
    read_at: "2026-08-03T09:00:00Z",
    created_at: "2026-08-03T08:00:00Z",
    actor: { id: "u3", display_name: "Carla", username: "carla" },
    thread: { id: "t2", title: "Crónicas del sur" },
  },
];

function makeLocals(supabase: ReturnType<typeof makeSupabase>, user: unknown) {
  return {
    supabase,
    user,
    profile: user
      ? { role: "rolero", display_name: "Ana", username: "ana" }
      : null,
  };
}

function makeEvent(locals: Record<string, unknown>): RequestEvent {
  return { locals } as unknown as RequestEvent;
}

const expectRedirect = (fn: () => Promise<unknown>, location: string) => {
  return fn().then(
    () => {
      throw new Error("expected a redirect to be thrown");
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(303);
      expect((e as { location?: string }).location).toBe(location);
    },
  );
};

const expectError = (fn: () => Promise<unknown>, status: number) => {
  return fn().then(
    () => {
      throw new Error("expected an http-error to be thrown");
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(status);
    },
  );
};

describe("notificaciones load() (REQ-NOTIF-02)", () => {
  it("redirects guests to /login (REQ-NOTIF-02: Guest no bell)", async () => {
    const supabase = makeSupabase({ notifications: NOTIF_ROWS });
    await expectRedirect(
      () => loadFn(makeEvent(makeLocals(supabase, null))),
      "/login",
    );
  });

  it("returns the user's notifications newest-first", async () => {
    const supabase = makeSupabase({ notifications: NOTIF_ROWS });
    const result = (await loadFn(
      makeEvent(makeLocals(supabase, { id: "u1" })),
    )) as { notifications: { id: string; read_at: string | null }[] };
    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe("n1");
    expect(result.notifications[0].read_at).toBeNull();
    expect(result.notifications[1].id).toBe("n2");

    const eqs = supabase.calls
      .filter((c) => c.method === "eq")
      .map((c) => c.args);
    expect(eqs).toContainEqual(["user_id", "u1"]);
    const orders = supabase.calls
      .filter((c) => c.method === "order")
      .map((c) => c.args);
    expect(orders).toContainEqual(["created_at", { ascending: false }]);
  });

  it("throws when the notification read fails", async () => {
    const supabase = makeSupabase({ error: new Error("read denied") });
    await expect(
      loadFn(makeEvent(makeLocals(supabase, { id: "u1" }))),
    ).rejects.toThrow("read denied");
  });
});

describe("notificaciones markRead action (REQ-NOTIF-02)", () => {
  it("redirects guests to /login", async () => {
    const supabase = makeSupabase();
    await expectRedirect(
      () => act("markRead")(makeEvent(makeLocals(supabase, null))),
      "/login",
    );
  });

  it("marks this user's unread notifications as read and returns ok", async () => {
    const supabase = makeSupabase();
    const result = await act("markRead")(
      makeEvent(makeLocals(supabase, { id: "u1" })),
    );
    expect(result).toEqual({ ok: true });

    const update = supabase.calls.find((c) => c.method === "update");
    expect(update).toBeDefined();
    const readAt = (update!.args[0] as { read_at: unknown }).read_at;
    expect(typeof readAt).toBe("string");
    const eqs = supabase.calls
      .filter((c) => c.method === "eq")
      .map((c) => c.args);
    expect(eqs).toContainEqual(["user_id", "u1"]);
    const isNull = supabase.calls
      .filter((c) => c.method === "is")
      .map((c) => c.args);
    expect(isNull).toContainEqual(["read_at", null]);
  });

  it("fails 400 when the mark-read update errors", async () => {
    const supabase = makeSupabase({ updateError: new Error("update denied") });
    const result = (await act("markRead")(
      makeEvent(makeLocals(supabase, { id: "u1" })),
    )) as { status: number; data: { message: string } };
    expect(result.status).toBe(400);
    expect(result.data.message).toBe("update denied");
  });
});

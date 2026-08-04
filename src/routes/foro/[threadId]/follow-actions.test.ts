/* eslint-disable @typescript-eslint/no-explicit-any -- action fn casts for a minimal handler mock */
import { describe, expect, it } from "vitest";
import { actions } from "./+page.server";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const followFn = actions.follow as (...a: unknown[]) => Promise<any>;
const unfollowFn = actions.unfollow as (...a: unknown[]) => Promise<any>;
const prefFn = actions.preference as (...a: unknown[]) => Promise<any>;

// Recording mock for the thread_follows operations the follow/unfollow/preference
// actions perform (via the forum helpers). Awaiting any chain resolves the
// configured error (or a clean success).
function createMock() {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  let opError: unknown = null;

  function chain(table: string) {
    const rec = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args });
      return c;
    };
    const c: Record<string, unknown> = {
      insert: (v: unknown) => rec("insert", v),
      select: (...a: unknown[]) => rec("select", ...a),
      update: (v: unknown) => rec("update", v),
      delete: () => rec("delete"),
      eq: (...a: unknown[]) => rec("eq", ...a),
      then: (ok: (r: unknown) => void, rej: (e: unknown) => void) =>
        opError ? rej(opError) : ok({ data: null, error: null }),
    };
    return c;
  }

  const client = {
    from: (t: string) => chain(t),
    setOpError: (e: unknown) => {
      opError = e;
    },
  };
  return {
    client: client as unknown as SupabaseClient,
    calls,
    setOpError: client.setOpError,
  };
}

const makeEvent = (locals: { user: unknown; profile: unknown }, client: unknown, notify = "on") =>
  ({
    locals: { ...locals, supabase: client },
    params: { threadId: "t1" },
    url: new URL("http://localhost/foro/t1"),
    request: new Request("http://localhost/foro/t1", {
      method: "POST",
      body: new URLSearchParams({ notify_in_app: notify }).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }),
  }) as any;

const authed = { user: { id: "user-9" }, profile: { id: "user-9", role: "rolero" } };

describe("thread detail follow action", () => {
  it("inserts a thread_follows row for the thread and authenticated user", async () => {
    const m = createMock();
    const res = await followFn(makeEvent(authed, m.client));
    const insert = m.calls.find((c) => c.method === "insert");
    expect(insert).toBeDefined();
    expect(insert!.args[0]).toEqual({ thread_id: "t1", user_id: "user-9" });
    expect(res).toEqual({ ok: true, following: true });
  });

  it("is idempotent: a duplicate follow (UNIQUE violation) is treated as success", async () => {
    const m = createMock();
    m.setOpError({ code: "23505", message: "duplicate key value violates unique constraint" });
    const res = await followFn(makeEvent(authed, m.client));
    expect(res).toEqual({ ok: true, following: true });
  });

  it("re-throws a non-duplicate follow error", async () => {
    const m = createMock();
    m.setOpError({ code: "PGRST116", message: "RLS denied" });
    await expect(followFn(makeEvent(authed, m.client))).rejects.toMatchObject({ code: "PGRST116" });
  });

  it("blocks a guest with a redirect to /login", async () => {
    const m = createMock();
    let status = 0;
    try {
      await followFn(makeEvent({ user: null, profile: null }, m.client));
    } catch (e) {
      status = (e as { status?: number }).status ?? 0;
    }
    expect(status).toBe(303);
    expect(m.calls.some((c) => c.method === "insert")).toBe(false);
  });
});

describe("thread detail unfollow action", () => {
  it("deletes the thread_follow row scoped to the thread and user", async () => {
    const m = createMock();
    const res = await unfollowFn(makeEvent(authed, m.client));
    expect(m.calls.some((c) => c.method === "delete")).toBe(true);
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["thread_id", "t1"]);
    expect(eqs).toContainEqual(["user_id", "user-9"]);
    expect(res).toEqual({ ok: true, following: false });
  });

  it("blocks a guest with a redirect to /login", async () => {
    const m = createMock();
    let status = 0;
    try {
      await unfollowFn(makeEvent({ user: null, profile: null }, m.client));
    } catch (e) {
      status = (e as { status?: number }).status ?? 0;
    }
    expect(status).toBe(303);
    expect(m.calls.some((c) => c.method === "delete")).toBe(false);
  });
});

describe("thread detail preference action", () => {
  it("enables in-app notifications when the toggle is on", async () => {
    const m = createMock();
    const res = await prefFn(makeEvent(authed, m.client, "on"));
    const update = m.calls.find((c) => c.method === "update");
    expect(update).toBeDefined();
    expect(update!.args[0]).toEqual({ notify_in_app: true });
    expect(res).toEqual({ ok: true, notify_in_app: true });
  });

  it("disables in-app notifications when the toggle is off", async () => {
    const m = createMock();
    const res = await prefFn(makeEvent(authed, m.client, ""));
    const update = m.calls.find((c) => c.method === "update");
    expect(update!.args[0]).toEqual({ notify_in_app: false });
    expect(res).toEqual({ ok: true, notify_in_app: false });
  });

  it("scopes the update to the thread and user", async () => {
    const m = createMock();
    await prefFn(makeEvent(authed, m.client, "on"));
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["thread_id", "t1"]);
    expect(eqs).toContainEqual(["user_id", "user-9"]);
  });

  it("blocks a guest with a redirect to /login", async () => {
    const m = createMock();
    let status = 0;
    try {
      await prefFn(makeEvent({ user: null, profile: null }, m.client, "on"));
    } catch (e) {
      status = (e as { status?: number }).status ?? 0;
    }
    expect(status).toBe(303);
    expect(m.calls.some((c) => c.method === "update")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  followThread,
  unfollowThread,
  setFollowPreference,
  getThreadFollow,
  getUnreadCount,
} from "../src/lib/forum";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

// RED test for the forum-follow-notif helper layer (Slice 1): follow/unfollow/
// getThreadFollow/getUnreadCount are thin supabase adapters, so we drive them with
// a lightweight recording mock that resolves awaited chains to a caller-set result.
type ChainCall = { table: string; method: string; args: unknown[] };

function createMockClient() {
  const calls: ChainCall[] = [];
  let currentResult: Record<string, unknown> = { error: null };

  function makeChain(table: string) {
    function record(method: string, ...args: unknown[]) {
      calls.push({ table, method, args });
      return chain;
    }
    const chain: Record<string, unknown> = {
      insert: (v: unknown) => record("insert", v),
      select: (...a: unknown[]) => record("select", ...a),
      update: (v: unknown) => record("update", v),
      delete: () => record("delete"),
      eq: (...a: unknown[]) => record("eq", ...a),
      is: (...a: unknown[]) => record("is", ...a),
      maybeSingle: () => record("maybeSingle"),
      single: () => record("single"),
      then: (onFulfilled: (r: unknown) => void) => onFulfilled(currentResult),
    };
    return chain;
  }

  const client = {
    from: (t: string) => makeChain(t),
    setResult: (r: Record<string, unknown>) => {
      currentResult = r;
    },
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    calls,
    setResult: client.setResult,
  };
}

describe("followThread", () => {
  it("inserts a thread_follows row with the given thread and user", async () => {
    const m = createMockClient();
    await followThread("thread-1", "user-9", m.client);
    expect(m.calls.map((c) => c.table)).toContain("thread_follows");
    const insert = m.calls.find((c) => c.method === "insert");
    expect(insert).toBeDefined();
    expect(insert!.args[0]).toEqual({
      thread_id: "thread-1",
      user_id: "user-9",
    });
  });

  it("throws when the insert fails", async () => {
    const m = createMockClient();
    m.setResult({ data: null, error: new Error("RLS denied") });
    await expect(followThread("thread-1", "user-9", m.client)).rejects.toThrow(
      "RLS denied",
    );
  });
});

describe("unfollowThread", () => {
  it("deletes the thread_follow filtered by thread and user", async () => {
    const m = createMockClient();
    await unfollowThread("thread-1", "user-9", m.client);
    expect(m.calls.filter((c) => c.method === "delete")).toHaveLength(1);
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["thread_id", "thread-1"]);
    expect(eqs).toContainEqual(["user_id", "user-9"]);
  });

  it("throws when the delete fails", async () => {
    const m = createMockClient();
    m.setResult({ data: null, error: new Error("gone") });
    await expect(unfollowThread("thread-1", "user-9", m.client)).rejects.toThrow(
      "gone",
    );
  });
});

describe("getThreadFollow", () => {
  it("reports following=true with the stored notify_in_app when a follow exists", async () => {
    const m = createMockClient();
    m.setResult({ data: { notify_in_app: false }, error: null });
    await expect(getThreadFollow("thread-1", "user-9", m.client)).resolves.toEqual(
      { following: true, notify_in_app: false },
    );
    const maybe = m.calls.find((c) => c.method === "maybeSingle");
    expect(maybe).toBeDefined();
  });

  it("reports following=false with default in-app enabled when no follow exists", async () => {
    const m = createMockClient();
    m.setResult({ data: null, error: null });
    await expect(getThreadFollow("thread-1", "user-9", m.client)).resolves.toEqual(
      { following: false, notify_in_app: true },
    );
  });

  it("queries the follow scoped to this thread and user", async () => {
    const m = createMockClient();
    m.setResult({ data: { notify_in_app: true }, error: null });
    await getThreadFollow("thread-1", "user-9", m.client);
    const eqs = m.calls
      .filter((c) => c.method === "eq")
      .map((c) => c.args);
    expect(eqs).toContainEqual(["thread_id", "thread-1"]);
    expect(eqs).toContainEqual(["user_id", "user-9"]);
  });

  it("throws on read error", async () => {
    const m = createMockClient();
    m.setResult({ data: null, error: new Error("prem") });
    await expect(getThreadFollow("thread-1", "user-9", m.client)).rejects.toThrow(
      "prem",
    );
  });
});

describe("setFollowPreference", () => {
  it("updates notify_in_app scoped to the thread and user", async () => {
    const m = createMockClient();
    await setFollowPreference("thread-1", "user-9", false, m.client);
    const update = m.calls.find((c) => c.method === "update");
    expect(update).toBeDefined();
    expect(update!.args[0]).toEqual({ notify_in_app: false });
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["thread_id", "thread-1"]);
    expect(eqs).toContainEqual(["user_id", "user-9"]);
  });

  it("writes notify_in_app true when re-enabled", async () => {
    const m = createMockClient();
    await setFollowPreference("thread-1", "user-9", true, m.client);
    const update = m.calls.find((c) => c.method === "update");
    expect(update!.args[0]).toEqual({ notify_in_app: true });
  });

  it("throws when the update fails", async () => {
    const m = createMockClient();
    m.setResult({ data: null, error: new Error("no row") });
    await expect(setFollowPreference("thread-1", "user-9", false, m.client)).rejects.toThrow(
      "no row",
    );
  });
});

describe("getUnreadCount", () => {
  it("returns the exact unread count for the user", async () => {
    const m = createMockClient();
    m.setResult({ count: 3, error: null });
    await expect(getUnreadCount("user-9", m.client)).resolves.toBe(3);
  });

  it("returns 0 when count is null-ish (e.g. no rows)", async () => {
    const m = createMockClient();
    m.setResult({ count: null, error: null });
    await expect(getUnreadCount("user-9", m.client)).resolves.toBe(0);
  });

  it("scopes to unread rows for this user only", async () => {
    const m = createMockClient();
    m.setResult({ count: 1, error: null });
    await getUnreadCount("user-9", m.client);
    expect(m.calls.map((c) => c.table)).toContain("notifications");
    const eqs = m.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["user_id", "user-9"]);
    const isNull = m.calls.filter((c) => c.method === "is").map((c) => c.args);
    expect(isNull).toContainEqual(["read_at", null]);
  });

  it("throws on read error", async () => {
    const m = createMockClient();
    m.setResult({ count: null, error: new Error("db down") });
    await expect(getUnreadCount("user-9", m.client)).rejects.toThrow("db down");
  });
});

/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import { load } from "../../src/routes/+layout.server";

// The root layout load feeds the Navbar bell badge (REQ-NOTIF-02 Unread
// badge): it must fetch the unread count for authenticated users only and
// degrade to zero instead of taking the whole app down on a query failure.
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

function makeSupabase(fixture: { count?: number | null; error?: unknown } = {}) {
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
      is: (...a: unknown[]) => {
        calls.push({ table, method: "is", args: a });
        return chain;
      },
      then: (res: (r: unknown) => void) =>
        res({ count: fixture.count ?? null, error: fixture.error ?? null }),
    };
    return chain;
  });
  return { from, calls };
}

function makeLocals(supabase: ReturnType<typeof makeSupabase>, user: unknown) {
  return { supabase, user, profile: user ? { role: "rolero" } : null, session: null };
}

describe("root layout load() unreadCount (REQ-NOTIF-02)", () => {
  it("skips the query and returns 0 for guests", async () => {
    const supabase = makeSupabase({ count: 3 });
    const result = await loadFn({ locals: makeLocals(supabase, null) });
    expect(result.unreadCount).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("loads the unread count for an authenticated user", async () => {
    const supabase = makeSupabase({ count: 3 });
    const result = await loadFn({ locals: makeLocals(supabase, { id: "u1" }) });
    expect(result.unreadCount).toBe(3);
    expect(supabase.from).toHaveBeenCalledWith("notifications");
    const eqs = supabase.calls.filter((c) => c.method === "eq").map((c) => c.args);
    expect(eqs).toContainEqual(["user_id", "u1"]);
    const isNull = supabase.calls.filter((c) => c.method === "is").map((c) => c.args);
    expect(isNull).toContainEqual(["read_at", null]);
  });

  it("degrades to 0 (instead of crashing the app) when the count query fails", async () => {
    const supabase = makeSupabase({ error: new Error("db down") });
    const result = await loadFn({ locals: makeLocals(supabase, { id: "u1" }) });
    expect(result.unreadCount).toBe(0);
  });
});

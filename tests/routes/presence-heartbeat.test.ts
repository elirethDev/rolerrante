import { describe, expect, it, vi } from "vitest";
import { POST } from "../../src/routes/api/presence/heartbeat/+server";

describe("POST /api/presence/heartbeat (REQ-CP-02)", () => {
  function makeSupabase(error: unknown = null) {
    const rpc = vi.fn().mockImplementation(() => {
      if (error) return Promise.reject(error);
      return Promise.resolve({ error: null });
    });
    return { rpc };
  }

  const run = (supabase: unknown, user: unknown) =>
    POST({ locals: { supabase, user } } as never);

  it("returns 401 for an unauthenticated request without calling touch_presence (REQ-CP-02)", async () => {
    const supabase = makeSupabase();
    const res = await run(supabase, null);
    expect(res.status).toBe(401);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("calls touch_presence and returns 204 for an authenticated user (REQ-CP-02)", async () => {
    const supabase = makeSupabase();
    const res = await run(supabase, { id: "u1" });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("touch_presence");
    expect(res.status).toBe(204);
  });

  it("fail-closes to 200 with an empty body when the RPC throws (REQ-CP-02)", async () => {
    const supabase = makeSupabase(new Error("rpc down"));
    const res = await run(supabase, { id: "u1" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("never calls the RPC for a guest (REQ-CP-05)", async () => {
    const supabase = makeSupabase();
    await run(supabase, null);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

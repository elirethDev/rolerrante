/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import {
  load,
  actions,
} from "../../../src/routes/admin/foro/hilos/[threadId]/+page.server";

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
const act = (name: string) =>
  (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface Fixture {
  thread?: { id: string; author_id: string; is_locked: boolean } | null;
  threadPerms?: unknown[];
}

function makeSupabase(fixture: Fixture = {}) {
  const calls: Record<string, unknown[]> = { update: [], upsert: [], rpc: [] };
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      update: vi.fn((row: unknown) => {
        calls.update.push(row);
        return b;
      }),
      upsert: vi.fn((row: unknown) => {
        calls.upsert.push(row);
        return b;
      }),
      maybeSingle: vi.fn(async () => ({
        data: table === "threads" ? (fixture.thread ?? null) : null,
        error: null,
      })),
      single: vi.fn(async () => ({ data: null, error: null })),
      then: (
        res: (...a: unknown[]) => void,
        rej: (...a: unknown[]) => void,
      ) => {
        const list =
          table === "thread_permissions" ? (fixture.threadPerms ?? []) : null;
        return Promise.resolve({ data: list, error: null }).then(res, rej);
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
  body = "",
  threadId = "t1",
  url = "http://localhost/admin/foro/hilos/t1",
) =>
  ({
    locals,
    params: { threadId },
    request: new Request(url, {
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

describe("admin/foro/hilos/[threadId] lock/unlock (REQ-FORUM-04.3)", () => {
  it("blocks the author from locking their own thread even when GM", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "gm-1", is_locked: false },
    });
    await expectError(
      () => act("lock")(makeEvent(makeLocals(supabase, "gm", "gm-1"))),
      403,
    );
    expect(supabase.calls.rpc).not.toContainEqual(
      expect.objectContaining({ name: "log_audit" }),
    );
  });

  it("blocks a non-staff (rolero) from locking", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "other", is_locked: false },
    });
    await expectError(
      () => act("lock")(makeEvent(makeLocals(supabase, "rolero", "role-1"))),
      403,
    );
  });

  it("lets a GM lock another thread and logs bloquear_hilo", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "other", is_locked: false },
    });
    const res = (await act("lock")(
      makeEvent(makeLocals(supabase, "gm", "gm-1")),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    expect((supabase.calls.update[0] as { is_locked: boolean }).is_locked).toBe(
      true,
    );
    expect((supabase.calls.update[0] as { locked_by: string }).locked_by).toBe(
      "gm-1",
    );
    const audit = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "log_audit",
    ) as { args: { p_action: string } };
    expect(audit.args.p_action).toBe("bloquear_hilo");
  });

  it("lets an admin reopen a locked thread and logs desbloquear_hilo", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "other", is_locked: true },
    });
    const res = (await act("unlock")(
      makeEvent(makeLocals(supabase, "admin", "admin-1")),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    expect((supabase.calls.update[0] as { is_locked: boolean }).is_locked).toBe(
      false,
    );
    const audit = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "log_audit",
    ) as { args: { p_action: string } };
    expect(audit.args.p_action).toBe("desbloquear_hilo");
  });
});

describe("admin/foro/hilos/[threadId] thread permissions (REQ-FORUM-04.2/04.4)", () => {
  it("persists thread flags and logs editar_permisos", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "other", is_locked: false },
    });
    const res = (await act("setThreadPermissions")(
      makeEvent(
        makeLocals(supabase, "admin", "admin-1"),
        "role=rolero&can_view=on&can_post=on",
      ),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("thread_permissions");
    expect(supabase.calls.upsert[0]).toMatchObject({
      thread_id: "t1",
      role: "rolero",
      can_view: true,
      can_post: true,
      can_edit: false,
      can_lock: false,
    });
    const audit = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "log_audit",
    ) as { args: { p_action: string; p_entity_id: string } };
    expect(audit.args.p_action).toBe("editar_permisos");
    expect(audit.args.p_entity_id).toBe("t1");
  });
});

describe("admin/foro/hilos/[threadId] load()", () => {
  it("returns thread and thread permissions for staff", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "other", is_locked: false },
      threadPerms: [],
    });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as {
      thread: { id: string };
    };
    expect(result.thread.id).toBe("t1");
    expect(supabase.from).toHaveBeenCalledWith("thread_permissions");
  });

  it("throws 403 for a non-staff", async () => {
    const supabase = makeSupabase({
      thread: { id: "t1", author_id: "other", is_locked: false },
    });
    await expectError(
      () => loadFn(makeEvent(makeLocals(supabase, "rolero", "r1"))),
      403,
    );
  });

  it("throws 404 when the thread does not exist", async () => {
    const supabase = makeSupabase({ thread: null });
    await expectError(() => loadFn(makeEvent(makeLocals(supabase))), 404);
  });
});

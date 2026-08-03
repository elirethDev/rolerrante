/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import {
  load,
  actions,
} from "../../../src/routes/admin/moderacion/+page.server";

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
const act = (name: string) =>
  (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface ThreadRow {
  id: string;
  status: string;
  content_type: string;
  linked_entity_type: "story" | "character" | "event" | null;
  linked_entity_id: string | null;
  author_id: string;
}

interface Fixture {
  thread?: ThreadRow | null;
  threads?: ThreadRow[];
  eventStatus?: string;
  reports?: unknown[];
  profile?: { role: string } | null;
  sanctions?: unknown[];
  rpcError?: { message: string } | null;
}

function makeSupabase(fixture: Fixture = {}) {
  const calls: Record<string, unknown[]> = { update: [], rpc: [] };
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      or: vi.fn(() => b),
      in: vi.fn(() => b),
      not: vi.fn(() => b),
      order: vi.fn(() => b),
      limit: vi.fn(() => b),
      update: vi.fn((row: unknown) => {
        calls.update.push(row);
        return b;
      }),
      maybeSingle: vi.fn(async () => ({
        data:
          table === "threads"
            ? (fixture.thread ?? null)
            : table === "profiles"
              ? (fixture.profile ?? null)
              : null,
        error: null,
      })),
      single: vi.fn(async () => ({
        data:
          table === "events"
            ? {
                id: fixture.thread?.linked_entity_id,
                status: fixture.eventStatus,
              }
            : table === "profiles"
              ? (fixture.profile ?? null)
              : null,
        error: null,
      })),
      then: (
        res: (...a: unknown[]) => void,
        rej: (...a: unknown[]) => void,
      ) => {
        const list =
          table === "threads"
            ? (fixture.threads ?? [])
            : table === "reports"
              ? (fixture.reports ?? [])
              : table === "user_sanctions"
                ? (fixture.sanctions ?? [])
                : null;
        return Promise.resolve({ data: list, error: null }).then(res, rej);
      },
    };
    return b;
  });
  const rpc = vi.fn(async (name: string, args: unknown) => {
    calls.rpc.push({ name, args });
    return { data: null, error: fixture.rpcError ?? null };
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
  url = "http://localhost/admin/moderacion",
) =>
  ({
    locals,
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

const storyThread = (over: Partial<ThreadRow> = {}): ThreadRow => ({
  id: "t1",
  status: "pendiente",
  content_type: "historia",
  linked_entity_type: "story",
  linked_entity_id: "story-1",
  author_id: "author-1",
  ...over,
});

describe("admin/moderacion load() (REQ-FORUM-05.1/05.2)", () => {
  it("throws 403 for a non-staff", async () => {
    const supabase = makeSupabase();
    await expectError(
      () => loadFn(makeEvent(makeLocals(supabase, "rolero", "r1"))),
      403,
    );
  });

  it("returns pending bridged threads and events for a staff member", async () => {
    const supabase = makeSupabase({ threads: [storyThread()] });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as {
      pendingThreads: ThreadRow[];
    };
    expect(result.pendingThreads[0].id).toBe("t1");
  });
});

describe("admin/moderacion approve/reject (REQ-FORUM-05.1/05.3)", () => {
  it("approves a pending story thread via approve_story and makes it public", async () => {
    const supabase = makeSupabase({ thread: storyThread() });
    const res = (await act("approveThread")(
      makeEvent(makeLocals(supabase)),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "approve_story",
    ) as { args: { p_story_id: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_story_id).toBe("story-1");
    expect((supabase.calls.update[0] as { status: string }).status).toBe(
      "aprobado",
    );
  });

  it("rejects a pending character thread via reject_character", async () => {
    const supabase = makeSupabase({
      thread: storyThread({
        content_type: "ficha",
        linked_entity_type: "character",
        linked_entity_id: "char-1",
      }),
    });
    const res = (await act("rejectThread")(
      makeEvent(makeLocals(supabase)),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "reject_character",
    ) as { args: { p_character_id: string; p_notes: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_character_id).toBe("char-1");
    expect((supabase.calls.update[0] as { status: string }).status).toBe(
      "rechazado",
    );
  });

  it("throws 403 when a non-staff tries to approve", async () => {
    const supabase = makeSupabase({ thread: storyThread() });
    await expectError(
      () =>
        act("approveThread")(makeEvent(makeLocals(supabase, "rolero", "r1"))),
      403,
    );
  });
});

describe("admin/moderacion event review (REQ-FORUM-05.3)", () => {
  it("blocks review when the event is NOT finalized (event-not-finalized guard)", async () => {
    const supabase = makeSupabase({
      thread: storyThread({
        content_type: "evento",
        linked_entity_type: "event",
        linked_entity_id: "ev-1",
      }),
      eventStatus: "en_curso",
    });
    const res = (await act("reviewEvent")(makeEvent(makeLocals(supabase)))) as {
      status: number;
    };
    expect(res.status).toBe(400);
    const conf = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "confirm_event_completion",
    );
    expect(conf).toBeUndefined();
  });

  it("runs confirm_event_completion when the event is finalized", async () => {
    const supabase = makeSupabase({
      thread: storyThread({
        content_type: "evento",
        linked_entity_type: "event",
        linked_entity_id: "ev-1",
      }),
      eventStatus: "finalizado",
    });
    const res = (await act("reviewEvent")(makeEvent(makeLocals(supabase)))) as {
      success: boolean;
    };
    expect(res.success).toBe(true);
    const conf = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "confirm_event_completion",
    ) as { args: { p_event_id: string } };
    expect(conf).toBeTruthy();
    expect(conf.args.p_event_id).toBe("ev-1");
  });
});

describe("admin/moderacion report queue (REQ-MOD-REP-02)", () => {
  it("loads abierta reports into an independent queue (REP-02.1/02.3)", async () => {
    const supabase = makeSupabase({
      threads: [storyThread()],
      reports: [
        {
          id: "rep-1",
          reason: "Spam",
          justification: "Repetido",
          status: "abierta",
          created_at: "2026-08-03T00:00:00Z",
          reporter: { id: "u1", display_name: "Aragorn", username: "aragon" },
          post: { id: "p1", thread_id: "t1", post_number: 2 },
        },
      ],
    });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as {
      reports: unknown[];
    };
    // The queue is a separate field, never merged into pendingThreads.
    expect(result.reports).toHaveLength(1);
    expect((result.reports[0] as { reason: string }).reason).toBe("Spam");
    expect(
      (result.reports[0] as { reporter: { display_name: string } }).reporter
        .display_name,
    ).toBe("Aragorn");
    expect(
      (result.reports[0] as { post: { thread_id: string } }).post.thread_id,
    ).toBe("t1");
  });

  it("resolves a report via resolve_report RPC with justification (REP-02.2)", async () => {
    const supabase = makeSupabase();
    const res = (await act("resolveReport")(
      makeEvent(
        makeLocals(supabase, "admin", "a1"),
        "reportId=rep-1&justification=Se retiro el contenido",
      ),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "resolve_report",
    ) as { args: { p_report_id: string; p_status: string; p_justification: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_report_id).toBe("rep-1");
    expect(rpcCall.args.p_status).toBe("resuelta");
    expect(rpcCall.args.p_justification).toBe("Se retiro el contenido");
  });

  it("discards a report via resolve_report RPC with status descartada", async () => {
    const supabase = makeSupabase();
    const res = (await act("discardReport")(
      makeEvent(
        makeLocals(supabase, "admin", "a1"),
        "reportId=rep-2&justification=Sin evidencia suficiente",
      ),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "resolve_report",
    ) as { args: { p_report_id: string; p_status: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_status).toBe("descartada");
  });

  it("requires a justification to resolve (REP-02.2 mandatory)", async () => {
    const supabase = makeSupabase();
    const res = (await act("resolveReport")(
      makeEvent(makeLocals(supabase, "admin", "a1"), "reportId=rep-1&justification="),
    )) as { status: number };
    expect(res.status).toBe(400);
  });

  it("blocks a non-staff from resolving reports", async () => {
    const supabase = makeSupabase();
    await expectError(
      () =>
        act("resolveReport")(
          makeEvent(
            makeLocals(supabase, "rolero", "r1"),
            "reportId=rep-1&justification=abuso",
          ),
        ),
      403,
    );
  });
});

const makeEnforcementEvent = (
  locals: ReturnType<typeof makeLocals>,
  body: string,
  action: "suspendUser" | "banUser" = "suspendUser",
) =>
  ({
    locals,
    request: new Request("http://localhost/admin/moderacion", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }),
  }) as unknown as RequestEvent;

const openReport = (over: Record<string, unknown> = {}) => ({
  id: "rep-1",
  reason: "Spam",
  justification: null,
  status: "abierta",
  created_at: "2026-08-03T00:00:00Z",
  reporter: { id: "reporter-1", display_name: "Reportero", username: "rep" },
  post: {
    id: "p1",
    thread_id: "t1",
    post_number: 2,
    author: { id: "author-1", display_name: "Frodo", username: "frodo", role: "rolero" },
  },
  ...over,
});

describe("admin/moderacion enforcement actions (REQ-MOD-ENF-01/02/04)", () => {
  const DAY_MS = 86_400_000;

  it("suspends a reported author via suspend_user RPC (admin only)", async () => {
    const supabase = makeSupabase({ profile: { role: "rolero" } });
    const res = (await act("suspendUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=author-1&duration=7&justification=Spam reiterado",
      ),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "suspend_user",
    ) as { args: { p_user_id: string; p_active_until: string; p_justification: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_user_id).toBe("author-1");
    // active_until is computed as now + 7 days.
    const untilMs = new Date(rpcCall.args.p_active_until).getTime();
    expect(untilMs).toBeGreaterThan(Date.now());
    expect(untilMs).toBeLessThanOrEqual(Date.now() + 7 * DAY_MS + 5_000);
    expect(rpcCall.args.p_justification).toBe("Spam reiterado");
  });

  it("bans a reported author via ban_user RPC (admin only)", async () => {
    const supabase = makeSupabase({ profile: { role: "rolero" } });
    const res = (await act("banUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=author-1&justification=Cuenta comprometida",
        "banUser",
      ),
    )) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find(
      (r) => (r as { name: string }).name === "ban_user",
    ) as { args: { p_user_id: string; p_justification: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_user_id).toBe("author-1");
    expect(rpcCall.args.p_justification).toBe("Cuenta comprometida");
  });

  it("requires a justification to suspend (ENF-01.2)", async () => {
    const supabase = makeSupabase({ profile: { role: "rolero" } });
    const res = (await act("suspendUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=author-1&duration=7&justification=",
      ),
    )) as { status: number };
    expect(res.status).toBe(400);
    expect(
      supabase.calls.rpc.some((r) => (r as { name: string }).name === "suspend_user"),
    ).toBe(false);
  });

  it("requires a positive duration to suspend", async () => {
    const supabase = makeSupabase({ profile: { role: "rolero" } });
    const res = (await act("suspendUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=author-1&duration=0&justification=x",
      ),
    )) as { status: number };
    expect(res.status).toBe(400);
    expect(
      supabase.calls.rpc.some((r) => (r as { name: string }).name === "suspend_user"),
    ).toBe(false);
  });

  it("requires a justification to ban (ENF-02.1)", async () => {
    const supabase = makeSupabase();
    const res = (await act("banUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=author-1&justification=",
        "banUser",
      ),
    )) as { status: number };
    expect(res.status).toBe(400);
    expect(
      supabase.calls.rpc.some((r) => (r as { name: string }).name === "ban_user"),
    ).toBe(false);
  });

  it("blocks a non-admin from suspending (403) and never calls the RPC", async () => {
    const supabase = makeSupabase({ profile: { role: "rolero" } });
    await expectError(
      () =>
        act("suspendUser")(
          makeEnforcementEvent(
            makeLocals(supabase, "gm", "g1"),
            "userId=author-1&duration=7&justification=x",
          ),
        ),
      403,
    );
    expect(
      supabase.calls.rpc.some((r) => (r as { name: string }).name === "suspend_user"),
    ).toBe(false);
  });

  it("blocks an admin/GM target server-side before calling the RPC (ENF-04)", async () => {
    // target is a GM -> app-level guard rejects, RPC never invoked
    const supabase = makeSupabase({ profile: { role: "gm" } });
    const res = (await act("banUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=gm-target&justification=x",
        "banUser",
      ),
    )) as { status: number };
    expect(res.status).toBe(400);
    expect(
      supabase.calls.rpc.some((r) => (r as { name: string }).name === "ban_user"),
    ).toBe(false);
  });

  it("surfaces the RPC rejection (e.g. admin/GM target) as a 400 message", async () => {
    // App guard passes (target is a normal rolero) but the RPC still rejects
    // (defence-in-depth) -> the action must surface that server error.
    const supabase = makeSupabase({
      profile: { role: "rolero" },
      rpcError: { message: "No se puede sancionar a un GM o admin" },
    });
    const res = (await act("banUser")(
      makeEnforcementEvent(
        makeLocals(supabase, "admin", "a1"),
        "userId=author-1&justification=x",
        "banUser",
      ),
    )) as { status: number; data: { message: string } };
    expect(res.status).toBe(400);
    expect(res.data.message).toContain("No se puede sancionar");
  });

  it("blocks a GM from resolving reports (admin-only enforcement)", async () => {
    const supabase = makeSupabase();
    await expectError(
      () =>
        act("resolveReport")(
          makeEvent(
            makeLocals(supabase, "gm", "g1"),
            "reportId=rep-1&justification=x",
          ),
        ),
      403,
    );
  });

  it("load returns the reported-user active sanctions and isAdmin flag", async () => {
    const supabase = makeSupabase({
      threads: [storyThread()],
      reports: [openReport()],
      sanctions: [{ user_id: "author-1", kind: "suspension", active_until: "2099-01-01T00:00:00.000Z" }],
    });
    const result = (await loadFn(makeEvent(makeLocals(supabase, "admin", "a1")))) as {
      sanctions: Record<string, { kind: string }>;
      isAdmin: boolean;
    };
    expect(result.isAdmin).toBe(true);
    expect(result.sanctions["author-1"].kind).toBe("suspension");
  });

  it("load reports a GM as non-admin so the queue renders read-only", async () => {
    const supabase = makeSupabase({ reports: [openReport()] });
    const result = (await loadFn(makeEvent(makeLocals(supabase, "gm", "g1")))) as {
      isAdmin: boolean;
      reports: unknown[];
    };
    expect(result.isAdmin).toBe(false);
    expect(result.reports).toHaveLength(1);
  });
});

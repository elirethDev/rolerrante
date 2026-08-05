/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { actions } from "../../../src/routes/perfil/+page.server";
import { buildVp8x, buildVp8l, toArrayBuffer } from "../../mockWebp";

const act = () =>
  actions.default as unknown as (...args: unknown[]) => Promise<any>;

function makeSupabase(
  fixture: { profile?: unknown; updates?: Array<Record<string, unknown>> } = {},
) {
  const updates = fixture.updates ?? [];
  const uploads: Array<{ path: string; bytes: Uint8Array }> = [];
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      update: vi.fn((row: unknown) => {
        if (table === "profiles") updates.push(row as Record<string, unknown>);
        return b;
      }),
      eq: vi.fn(() => b),
      maybeSingle: vi.fn(async () => ({
        data: fixture.profile ?? null,
        error: null,
      })),
      single: vi.fn(async () => ({
        data: fixture.profile ?? null,
        error: null,
      })),
    };
    return b;
  });
  const storageFrom = vi.fn((bucket: string) => {
    if (bucket !== "avatars") throw new Error(`unexpected bucket ${bucket}`);
    return {
      upload: vi.fn(async (path: string, body: unknown) => {
        uploads.push({ path, bytes: new Uint8Array(body as ArrayBuffer) });
        return { data: { path }, error: null };
      }),
    };
  });
  return {
    from,
    updates,
    uploads,
    storageFrom,
    storage: { from: storageFrom },
  };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>) =>
  ({
    supabase,
    user: { id: "u1" },
    profile: { id: "u1", username: "pablo" },
  }) as never;

const makeEvent = (supabase: ReturnType<typeof makeSupabase>, form: FormData) =>
  ({
    locals: makeLocals(supabase),
    request: { formData: async () => form },
  }) as unknown as RequestEvent;

describe("perfil avatar action (REQ-AVUP-03/05)", () => {
  it("uploads a valid WebP and persists the public URL (profile path)", async () => {
    const form = new FormData();
    form.set("display_name", "Pablo");
    form.set(
      "avatar_file",
      new File([toArrayBuffer(buildVp8x(512, 512))], "avatar.webp", {
        type: "image/webp",
      }),
    );
    const supabase = makeSupabase();
    const res = await act()(makeEvent(supabase, form));

    expect(res).toEqual({ success: true });
    expect(supabase.uploads.length).toBe(1);
    expect(supabase.uploads[0].path).toBe("avatars/u1/avatar.webp");
    const stored = supabase.updates[0] as Record<string, unknown>;
    expect(stored.avatar_url).toBe(
      "https://example.supabase.co/storage/v1/object/public/avatars/avatars/u1/avatar.webp",
    );
  });

  it("rejects a non-WebP upload with fail(400) and no upload", async () => {
    const form = new FormData();
    form.set("display_name", "Pablo");
    form.set(
      "avatar_file",
      new File(
        [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])],
        "x.jpg",
        { type: "image/jpeg" },
      ),
    );
    const supabase = makeSupabase();
    const res = await act()(makeEvent(supabase, form));

    expect((res as { status: number }).status).toBe(400);
    expect(supabase.uploads.length).toBe(0);
  });

  it("rejects an oversized upload (>150KB) with fail(400) and no upload", async () => {
    const big = new Uint8Array(150_001);
    big.set(buildVp8x(512, 512), 0);
    const form = new FormData();
    form.set("display_name", "Pablo");
    form.set(
      "avatar_file",
      new File([big], "big.webp", { type: "image/webp" }),
    );
    const supabase = makeSupabase();
    const res = await act()(makeEvent(supabase, form));

    expect((res as { status: number }).status).toBe(400);
    expect(supabase.uploads.length).toBe(0);
  });

  it("rejects non-square dimensions with fail(400)", async () => {
    const form = new FormData();
    form.set("display_name", "Pablo");
    form.set(
      "avatar_file",
      new File([toArrayBuffer(buildVp8l(1024, 512))], "wide.webp", {
        type: "image/webp",
      }),
    );
    const supabase = makeSupabase();
    const res = await act()(makeEvent(supabase, form));

    expect((res as { status: number }).status).toBe(400);
    expect(supabase.uploads.length).toBe(0);
  });

  it("keeps the pasted https URL fallback when no file is uploaded", async () => {
    const form = new FormData();
    form.set("display_name", "Pablo");
    form.set("avatar_url", "https://img.example.com/me.png");
    const supabase = makeSupabase();
    const res = await act()(makeEvent(supabase, form));

    expect(res).toEqual({ success: true });
    expect(supabase.uploads.length).toBe(0);
    const stored = supabase.updates[0] as Record<string, unknown>;
    expect(stored.avatar_url).toBe("https://img.example.com/me.png");
  });

  it("persists null when the avatar field is empty and no file", async () => {
    const form = new FormData();
    form.set("display_name", "Pablo");
    const supabase = makeSupabase();
    const res = await act()(makeEvent(supabase, form));

    expect(res).toEqual({ success: true });
    const stored = supabase.updates[0] as Record<string, unknown>;
    expect(stored.avatar_url).toBeNull();
  });
});

/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { actions } from "../../../src/routes/personajes/[id]/editar/+page.server";
import { buildVp8x, toArrayBuffer } from "../../mockWebp";

const act = (name: string) =>
  (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface Fixture {
  character?: Record<string, unknown> | null;
  role?: string;
  rpcError?: { message: string } | null;
}

function makeSupabase(fixture: Fixture = {}) {
  const updates: Array<Record<string, unknown>> = [];
  const uploads: Array<{ path: string }> = [];
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      update: vi.fn((row: unknown) => {
        if (table === "characters")
          updates.push(row as Record<string, unknown>);
        return b;
      }),
      eq: vi.fn(() => b),
      single: vi.fn(async () => ({
        data:
          table === "characters"
            ? (fixture.character ?? null)
            : table === "races"
              ? null
              : null,
        error: null,
      })),
    };
    return b;
  });
  const storageFrom = vi.fn((bucket: string) => {
    if (bucket !== "avatars") throw new Error(`unexpected bucket ${bucket}`);
    return {
      upload: vi.fn(async (path: string) => {
        uploads.push({ path });
        return { data: { path }, error: null };
      }),
    };
  });
  const rpc = vi.fn(async () => ({
    data: null,
    error: fixture.rpcError ?? null,
  }));
  return {
    from,
    updates,
    uploads,
    storageFrom,
    rpc,
    storage: { from: storageFrom },
  };
}

const character = (over: Record<string, unknown> = {}) => ({
  id: "char-1",
  player_id: "u1",
  name: "Aragorn",
  race_id: "r1",
  status: "pendiente",
  avatar_url: null,
  ...over,
});

const makeLocals = (
  supabase: ReturnType<typeof makeSupabase>,
  role: "rolero" | "gm" | "admin" = "rolero",
  id = "u1",
) => ({ supabase, user: { id }, profile: { id, role } }) as never;

const makeEvent = (
  supabase: ReturnType<typeof makeSupabase>,
  form: FormData,
  params = { id: "char-1" },
) =>
  ({
    locals: makeLocals(supabase),
    request: { formData: async () => form },
    params,
  }) as unknown as RequestEvent;

const formWith = (fields: Record<string, unknown>) => {
  const form = new FormData();
  form.set("name", "Aragorn");
  form.set("race_id", "r1");
  form.set("age", "87");
  form.set("attr_fis", "5");
  form.set("attr_des", "5");
  form.set("attr_int", "5");
  form.set("attr_per", "5");
  form.set("attr_esp", "5");
  form.set("mana_source", "I");
  form.set("status", "pendiente");
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof File) form.set(k, v, (v as File).name);
    else form.set(k, String(v));
  }
  return form;
};

describe("personajes/[id]/editar avatar action (REQ-AVUP-03/05)", () => {
  it("default action uploads a valid WebP to the character path and persists it", async () => {
    const supabase = makeSupabase({ character: character() });
    const form = formWith({
      avatar_file: new File(
        [toArrayBuffer(buildVp8x(512, 512))],
        "retrato.webp",
        {
          type: "image/webp",
        },
      ),
    });
    const res = act("default")(makeEvent(supabase, form));

    await expect(res).rejects.toMatchObject({ status: 303 });
    expect(supabase.uploads.length).toBe(1);
    expect(supabase.uploads[0].path).toBe("char-avatars/char-1/retrato.webp");
    expect(supabase.updates[0].avatar_url).toContain(
      "storage/v1/object/public/avatars/char-avatars/char-1/retrato.webp",
    );
  });

  it("request_review action uploads the avatar before sending to review", async () => {
    const supabase = makeSupabase({ character: character() });
    const form = formWith({
      status: "pendiente",
      avatar_file: new File([toArrayBuffer(buildVp8x(512, 512))], "x.webp", {
        type: "image/webp",
      }),
    });
    const res = act("request_review")(makeEvent(supabase, form));

    await expect(res).rejects.toMatchObject({ status: 303 });
    expect(supabase.uploads.length).toBe(1);
    expect(supabase.uploads[0].path).toBe("char-avatars/char-1/x.webp");
    expect(supabase.rpc).toHaveBeenCalledWith("request_character_review", {
      p_character_id: "char-1",
    });
  });

  it("rejects an invalid (non-WebP) upload with fail(400) and no storage write", async () => {
    const supabase = makeSupabase({ character: character() });
    const form = formWith({
      avatar_file: new File(
        [
          toArrayBuffer(
            new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]),
          ),
        ],
        "x.jpg",
        { type: "image/jpeg" },
      ),
    });
    const res = await act("default")(makeEvent(supabase, form));

    expect((res as { status: number }).status).toBe(400);
    expect(supabase.uploads.length).toBe(0);
    expect(supabase.updates.length).toBe(0);
  });

  it("keeps the pasted https URL fallback when no file is uploaded", async () => {
    const supabase = makeSupabase({ character: character() });
    const form = formWith({ avatar_url: "https://img.example.com/ar.png" });
    const res = act("default")(makeEvent(supabase, form));

    await expect(res).rejects.toMatchObject({ status: 303 });
    expect(supabase.uploads.length).toBe(0);
    expect(supabase.updates[0].avatar_url).toBe(
      "https://img.example.com/ar.png",
    );
  });

  it("preserves the 403 gate: a non-owner non-staff cannot upload", async () => {
    const supabase = makeSupabase({
      character: character({ player_id: "other" }),
    });
    const form = formWith({
      avatar_file: new File([toArrayBuffer(buildVp8x(512, 512))], "a.webp", {
        type: "image/webp",
      }),
    });
    const res = await act("default")(
      makeEvent(supabase, form, { id: "char-1" }),
    );

    expect((res as { status: number }).status).toBe(403);
    expect(supabase.uploads.length).toBe(0);
  });
});

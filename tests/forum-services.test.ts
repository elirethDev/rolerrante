import { describe, expect, it } from "vitest";
import {
  resolveEffectivePermissions,
  validateForumImageUrls,
  type PermissionFlags,
  type PermissionInput,
} from "../src/lib/auth";
import type { UserRole } from "../src/lib/types";

type SectionRow = PermissionFlags;

// RED test (REQ-FORUM-02.4 / 04.2): table-driven over role x section x thread combos.
describe("resolveEffectivePermissions", () => {
  it.each<UserRole>(["pendiente", "rolero", "gm", "admin"])(
    "returns read-only defaults for a guest (%s) with no section/thread grants",
    (role) => {
      const input: PermissionInput = { section: null, thread: null, role };
      const result = resolveEffectivePermissions(input);
      if (role === "pendiente") {
        expect(result).toEqual({
          can_view: false,
          can_post: false,
          can_edit: false,
          can_lock: false,
        });
      }
    },
  );

  it("grants a guest can_view when the admin grants it at section level", () => {
    const section: SectionRow = {
      can_view: true,
      can_post: false,
      can_edit: false,
      can_lock: false,
    };
    const result = resolveEffectivePermissions({
      section,
      thread: null,
      role: "pendiente",
    });
    expect(result.can_view).toBe(true);
    expect(result.can_post).toBe(false);
    expect(result.can_edit).toBe(false);
    expect(result.can_lock).toBe(false);
  });

  it("keeps can_lock locked to GM/admin regardless of granted flags", () => {
    const section: SectionRow = {
      can_view: true,
      can_post: true,
      can_edit: true,
      can_lock: true,
    };
    expect(
      resolveEffectivePermissions({ section, thread: null, role: "rolero" })
        .can_lock,
    ).toBe(false);
    expect(
      resolveEffectivePermissions({ section, thread: null, role: "pendiente" })
        .can_lock,
    ).toBe(false);
    expect(
      resolveEffectivePermissions({ section, thread: null, role: "gm" })
        .can_lock,
    ).toBe(true);
    expect(
      resolveEffectivePermissions({ section, thread: null, role: "admin" })
        .can_lock,
    ).toBe(true);
  });

  it("thread flags override section defaults", () => {
    const section: SectionRow = {
      can_view: true,
      can_post: false,
      can_edit: false,
      can_lock: false,
    };
    const thread: SectionRow = {
      can_view: true,
      can_post: true,
      can_edit: true,
      can_lock: false,
    };
    const result = resolveEffectivePermissions({
      section,
      thread,
      role: "rolero",
    });
    expect(result.can_post).toBe(true);
    expect(result.can_edit).toBe(true);
  });

  it("role defaults apply when no section row exists", () => {
    expect(
      resolveEffectivePermissions({
        section: null,
        thread: null,
        role: "rolero",
      }),
    ).toEqual({
      can_view: true,
      can_post: true,
      can_edit: false,
      can_lock: false,
    });
    expect(
      resolveEffectivePermissions({ section: null, thread: null, role: "gm" }),
    ).toEqual({
      can_view: true,
      can_post: true,
      can_edit: true,
      can_lock: true,
    });
  });
});

// RED test (REQ-FORUM-03.5): server-side image URL protocol validation.
describe("validateForumImageUrls", () => {
  it("accepts http and https image sources", () => {
    const html =
      '<img src="https://cdn.example.com/a.png"><img src="http://x.org/b.jpg">';
    const result = validateForumImageUrls(html);
    expect(result.valid).toBe(true);
    expect(result.rejected).toEqual([]);
  });

  it.each([
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "file:///etc/passwd",
  ])("rejects unsafe protocol %s", (url) => {
    const html = `<p>hola</p><img src="${url}">`;
    const result = validateForumImageUrls(html);
    expect(result.valid).toBe(false);
    expect(result.rejected).toContain(url);
  });

  it("returns an empty accepted result when there are no images", () => {
    expect(validateForumImageUrls("<p>texto plano</p>")).toEqual({
      valid: true,
      rejected: [],
    });
  });
});

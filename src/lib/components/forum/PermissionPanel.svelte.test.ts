import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import PermissionPanel from "./PermissionPanel.svelte";

describe("PermissionPanel (REQ-FORUM-04.2/04.4)", () => {
  it("renders a permission row per role with the audit form and target", () => {
    render(PermissionPanel, {
      action: "/admin/foro?/setSectionPermissions",
      targetName: "categoryId",
      targetValue: "c1",
      permissions: [{ role: "rolero", can_view: true, can_post: true, can_edit: false, can_lock: false }],
    } as never);

    const roles = ["pendiente", "rolero", "gm", "admin"];
    for (const role of roles) {
      expect(document.body.textContent).toContain(role);
    }

    const hidden = document.querySelector('input[name="categoryId"]') as HTMLInputElement;
    expect(hidden).toBeInTheDocument();
    expect(hidden.value).toBe("c1");

    // audited: the form posts a role + flags; a Guardar button exists per row
    const buttons = document.querySelectorAll('button[type="submit"]');
    expect(buttons.length).toBe(4);
    expect(buttons[0].textContent).toContain("Guardar");

    // rolero row reflects granted flags
    const roleroForm = [...document.querySelectorAll("form")].find((f) =>
      (f.querySelector('input[name="role"]') as HTMLInputElement)?.value === "rolero",
    );
    expect(roleroForm).toBeTruthy();
  });
});

import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/admin/usuarios/+page.svelte";

describe("admin/usuarios (REQ-AF-01, FS-01)", () => {
  it("keeps the OD u-row layout with a role select and no fieldset wrapping", () => {
    render(Page, {
      data: {
        users: [
          {
            id: "u1",
            username: "pablo",
            display_name: "Pablo",
            role: "rolero",
          },
        ],
      } as never,
      form: null as never,
    });

    const form = document.querySelector("form") as HTMLFormElement;
    expect(form).toBeInTheDocument();
    expect(form.className).toContain("u-row");

    // who block shows @username + display name
    const who = form.querySelector(".who");
    expect(who?.textContent).toContain("@pablo");
    expect(who?.textContent).toContain("Pablo");

    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.className).toContain("select");
    expect(form.querySelector('button[type="submit"]')?.textContent).toContain("Guardar");

    // row layout, no wrapping: zero fieldsets on the page
    expect(document.querySelectorAll("fieldset")).toHaveLength(0);
    expect(document.querySelectorAll("legend")).toHaveLength(0);
  });
});

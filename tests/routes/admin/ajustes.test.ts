import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/admin/ajustes/+page.svelte";

describe("admin/ajustes (REQ-AF-01)", () => {
  it("renders each setting as a labeled set-row with input and Guardar", () => {
    render(Page, {
      data: {
        settings: [{ key: "max_personajes", value: "5" }],
      } as never,
      form: null as never,
    });

    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    // OD admin-ajustes.html: .set-row keeps the inline row flex layout
    expect(form?.className).toContain("set-row");

    // each setting renders as an OD .field with a label + value input
    expect(form?.querySelector(".field")).toBeTruthy();
    expect(form?.querySelector("label")?.textContent).toContain("max_personajes");
    expect(form?.querySelector('input[name="value"]')).toBeTruthy();
    expect(form?.querySelector('button[type="submit"]')?.textContent).toContain("Guardar");

    // row layout: OD .field, no fieldset wrapping
    expect(document.querySelectorAll("fieldset")).toHaveLength(0);
  });
});

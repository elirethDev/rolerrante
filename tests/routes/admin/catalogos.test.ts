import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/admin/catalogos/+page.svelte";

describe("admin/catalogos (REQ-AF-01, FS-01/04)", () => {
  it("renders all form fields as OD labeled fields with legible group labels", async () => {
    render(Page, {
      data: { races: [], skills: [] } as never,
      form: null as never,
    });

    // The race and skill forms are toggled behind buttons
    await fireEvent.click(screen.getByRole("button", { name: "Nueva raza" }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Nueva habilidad" }),
    );

    // OD .field markup: each control has an associated label
    const fieldLabels = Array.from(
      document.querySelectorAll(".field > label"),
    ).map((l) => l.textContent?.trim());
    expect(fieldLabels).toContain("Nombre");
    expect(fieldLabels).toContain("Grupo");
    expect(fieldLabels).toContain("Atributo");

    // nested group headers use the OD .label utility (Datos físicos / Edad)
    const groupLabels = Array.from(
      document.querySelectorAll(".field .label"),
    ).map((l) => l.textContent?.trim());
    expect(groupLabels).toContain("Datos físicos");
    expect(groupLabels).toContain("Edad");
    expect(groupLabels).toContain("Requiere especialización");

    // no fieldset wrapping (OD fields, not daisyUI Fieldset)
    expect(document.querySelectorAll("fieldset")).toHaveLength(0);

    // no max-w constraint on admin container (REQ-FS-04 admin full-width)
    expect(document.querySelector('[class*="max-w"]')).toBeNull();
  });

  it("wraps the requires-specialization checkbox in a label.check (REQ-FS-02)", async () => {
    render(Page, {
      data: { races: [], skills: [] } as never,
      form: null as never,
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Nueva habilidad" }),
    );

    const checkbox = document.querySelector(
      'input[name="requires_specialization"]',
    ) as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    // the checkbox control sits inside a .check label within an OD .field:
    // no separate label-row pattern.
    expect(checkbox.closest("label.check")).toBeTruthy();
    const field = checkbox.closest(".field") as HTMLElement;
    expect(field).toBeTruthy();
    expect(field.querySelector(".label")?.textContent).toContain(
      "Requiere especialización",
    );
    expect(document.querySelector("fieldset > label")).toBeNull();
  });
});

import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/gm/eventos/+page.svelte";

describe("gm/eventos (REQ-FS-05)", () => {
  it("wraps the XP control in a Field with a legend, keeping the w-20 stepper", () => {
    render(Page, {
      data: {
        events: [
          {
            id: "e1",
            title: "Mazmorra del Dragón",
            creator: { display_name: "Pablo" },
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      } as never,
      form: null as never,
    });

    const fieldset = document.querySelector("fieldset");
    expect(fieldset).toBeInTheDocument();
    const legend = fieldset?.querySelector("legend");
    expect(legend?.textContent).toContain("XP por participante");

    const xp = document.querySelector('input[name="xp"]') as HTMLInputElement;
    expect(xp).toBeInTheDocument();
    expect(xp).toHaveClass("w-20");
    // label-row pattern removed: no <label> wraps the XP input
    expect(document.querySelectorAll("label")).toHaveLength(0);
  });
});

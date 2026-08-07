import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type {
  ActionData,
  PageData,
} from "../../../src/routes/personajes/nuevo/$types";
import Page from "../../../src/routes/personajes/nuevo/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerPageTokens,
  expectRenderedPlayerForm,
} from "../../../src/test/page-vision";

const data = {
  skills: [
    {
      id: "s1",
      name: "Espadas",
      attribute: "D",
      description: "Combate cuerpo a cuerpo",
      requires_specialization: true,
      specializations: ["Mandoble"],
    },
  ],
  races: [
    {
      id: "r1",
      name: "Humano",
      group_name: "",
      description: "",
      magic_access: [],
      size: "M",
      physical_data: {},
      age_data: {},
    },
  ],
  creationPoints: 25,
};

function habilidadBadge(container: HTMLElement): HTMLElement {
  const card = [...container.querySelectorAll(".form-card")].find((c) =>
    c.textContent?.includes("Habilidades"),
  );
  const word = card?.querySelector(".budget-word");
  if (!word) throw new Error("habilidad badge not found");
  return word as HTMLElement;
}

// The wizard renders 8 basic Fields (incl. avatar_url y origin, OD) plus 5
// AttributeInput Fields (one per attribute).
const EXPECTED_FIELDSETS = 13;

describe("personajes/nuevo page (forms-visual-pass / PR 2)", () => {
  it("uses the Field primitive — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/personajes/nuevo/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("keeps max-w-[1180px] wizard container with md density (REQ-FS-01/FS-04)", () => {
    expectPlayerPageTokens(
      readPageSource(
        "../../../src/routes/personajes/nuevo/+page.svelte",
        import.meta.url,
      ),
      "max-w-[1180px]",
    );
  });

  it("renders all Field groups (8 basic + 5 attributes) at md density inside max-w-[1180px]", () => {
    const { container } = render(Page, {
      data: data as unknown as PageData,
      form: {} as unknown as ActionData,
    });
    expectRenderedPlayerForm(container, "max-w-[1180px]", EXPECTED_FIELDSETS);
  });

  it("fires skill input handling via oninput and updates remaining points (REQ-NV-01)", () => {
    const { container } = render(Page, {
      data: data as unknown as PageData,
      form: {} as unknown as ActionData,
    });
    const badge = habilidadBadge(container);
    const before = badge.textContent;

    const input = container.querySelector(
      "#skill_level_s1",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "3" } });

    // skillCreationCost(3) = 6 → remaining 25 - 6 = 19
    expect(badge.textContent).not.toBe(before);
    expect(badge.textContent).toContain("19");
  });
});

import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { ActionData } from "../../../src/routes/registro/$types";
import Page from "../../../src/routes/registro/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerPageTokens,
  expectRenderedPlayerForm,
} from "../../../src/test/page-vision";

describe("registro page (forms-visual-pass / PR 2)", () => {
  it("uses the Field primitive — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/registro/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("keeps md density and max-w-md auth container (REQ-PF-02/FS-01/FS-04)", () => {
    expectPlayerPageTokens(
      readPageSource(
        "../../../src/routes/registro/+page.svelte",
        import.meta.url,
      ),
      "max-w-md",
    );
  });

  it("renders 4 fieldset-legend Field groups at md density inside max-w-md", () => {
    const { container } = render(Page, { form: {} as unknown as ActionData });
    expectRenderedPlayerForm(container, "max-w-md", 4);
  });

  it("passes inline error spans through the Field error prop (REQ-PF-02)", () => {
    const { container } = render(Page, {
      form: { errors: { email: "Email inválido" } } as unknown as ActionData,
    });
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);
    expect(alerts[0]).toHaveTextContent("Email inválido");
  });
});

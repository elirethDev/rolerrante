import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { ActionData } from "../../../src/routes/registro/$types";
import Page from "../../../src/routes/registro/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerAuthTokens,
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

  it("keeps md density and the AuthShell auth container (REQ-PF-02/FS-01/FS-04)", () => {
    expectPlayerAuthTokens(
      readPageSource(
        "../../../src/routes/registro/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("renders 5 fieldset-legend Field groups at md density inside the auth container", () => {
    const { container } = render(Page, { form: {} as unknown as ActionData });
    expectRenderedPlayerForm(container, "max-w-[440px]", 5);
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

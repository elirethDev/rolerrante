import { render } from "@testing-library/svelte";
import { describe, it } from "vitest";
import type { ActionData } from "../../../src/routes/eventos/nuevo/$types";
import Page from "../../../src/routes/eventos/nuevo/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerPageTokens,
  expectRenderedPlayerForm,
} from "../../../src/test/page-vision";

describe("eventos/nuevo page (forms-visual-pass / PR 2)", () => {
  it("uses the Field primitive — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/eventos/nuevo/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("keeps max-w-3xl container with md density (REQ-FS-01/FS-04)", () => {
    expectPlayerPageTokens(
      readPageSource(
        "../../../src/routes/eventos/nuevo/+page.svelte",
        import.meta.url,
      ),
      "max-w-3xl",
    );
  });

  it("renders 7 fieldset-legend Field groups at md density inside max-w-3xl", () => {
    const { container } = render(Page, { form: {} as unknown as ActionData });
    expectRenderedPlayerForm(container, "max-w-3xl", 7);
  });
});

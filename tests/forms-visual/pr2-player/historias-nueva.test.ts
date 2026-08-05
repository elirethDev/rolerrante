import { render } from "@testing-library/svelte";
import { describe, it } from "vitest";
import type {
  ActionData,
  PageData,
} from "../../../src/routes/historias/nueva/$types";
import Page from "../../../src/routes/historias/nueva/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerPageTokens,
  expectRenderedPlayerForm,
} from "../../../src/test/page-vision";

describe("historias/nueva page (forms-visual-pass / PR 2)", () => {
  it("uses the Field primitive — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/historias/nueva/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("keeps max-w-[1180px] container with md density (REQ-FS-01/FS-04)", () => {
    expectPlayerPageTokens(
      readPageSource(
        "../../../src/routes/historias/nueva/+page.svelte",
        import.meta.url,
      ),
      "max-w-[1180px]",
    );
  });

  it("renders 3 fieldset-legend Field groups at md density inside max-w-[1180px]", () => {
    const { container } = render(Page, {
      data: {
        characters: [{ id: "c1", name: "Aragorn" }],
      } as unknown as PageData,
      form: {} as unknown as ActionData,
    });
    expectRenderedPlayerForm(container, "max-w-[1180px]", 3);
  });
});

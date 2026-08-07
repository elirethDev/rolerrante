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

  it("keeps the OD create-wrap container with md density (REQ-FS-01/FS-04)", () => {
    expectPlayerPageTokens(
      readPageSource(
        "../../../src/routes/historias/nueva/+page.svelte",
        import.meta.url,
      ),
      "create-wrap",
    );
  });

  it("renders the fieldset-legend Field groups at md density inside create-wrap", () => {
    const { container } = render(Page, {
      data: {
        characters: [{ id: "c1", name: "Aragorn" }],
      } as unknown as PageData,
      form: {} as unknown as ActionData,
    });
    expectRenderedPlayerForm(container, "create-wrap", 2);
  });
});

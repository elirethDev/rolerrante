import { render } from "@testing-library/svelte";
import { describe, it } from "vitest";
import type { ActionData, PageData } from "../../../src/routes/perfil/$types";
import Page from "../../../src/routes/perfil/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerPageTokens,
  expectRenderedPlayerForm,
} from "../../../src/test/page-vision";

const profile = {
  id: "u1",
  username: "pablo",
  display_name: "Pablo",
  avatar_url: null,
  role: "player",
};

describe("perfil page (forms-visual-pass / PR 2)", () => {
  it("uses the Field primitive — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/perfil/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("widen container max-w-xl → max-w-3xl (REQ-FS-04), md density (REQ-FS-01)", () => {
    expectPlayerPageTokens(
      readPageSource(
        "../../../src/routes/perfil/+page.svelte",
        import.meta.url,
      ),
      "max-w-3xl",
    );
  });

  it("renders 2 fieldset-legend Field groups at md density inside max-w-3xl", () => {
    const { container } = render(Page, {
      data: { profile } as unknown as PageData,
      form: {} as unknown as ActionData,
    });
    expectRenderedPlayerForm(container, "max-w-3xl", 2);
  });
});

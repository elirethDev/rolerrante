import { render } from "@testing-library/svelte";
import { describe, it } from "vitest";
import type { ActionData, PageData } from "../../../src/routes/login/$types";
import Page from "../../../src/routes/login/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
  expectPlayerAuthTokens,
  expectRenderedAuthForm,
} from "../../../src/test/page-vision";

describe("login page (forms-visual-pass / PR 2)", () => {
  it("renders OD fields — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource("../../../src/routes/login/+page.svelte", import.meta.url),
    );
  });

  it("keeps md density and the AuthShell auth container (REQ-PF-02/FS-01/FS-04)", () => {
    expectPlayerAuthTokens(
      readPageSource("../../../src/routes/login/+page.svelte", import.meta.url),
    );
  });

  it("renders 2 OD .field groups inside the .auth-form", () => {
    const { container } = render(Page, {
      data: { registrado: false } as unknown as PageData,
      form: {} as unknown as ActionData,
    });
    expectRenderedAuthForm(container, 2);
  });
});

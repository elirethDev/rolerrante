import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/admin/ajustes/+page.svelte";

describe("admin/ajustes (REQ-AF-01)", () => {
  it("renders each setting as Field size=sm keeping the inline row flex layout", () => {
    render(Page, {
      data: {
        settings: [{ key: "max_personajes", value: "5" }],
      } as never,
      form: null as never,
    });

    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    // inline row flex layout kept
    expect(form?.className).toContain("flex");

    const fieldset = form?.querySelector("fieldset");
    expect(fieldset?.className).toContain("fieldset-sm");
    expect(fieldset?.querySelector("legend")?.textContent).toContain(
      "max_personajes",
    );
    expect(fieldset?.querySelector("legend")?.className).toContain(
      "text-[13px]",
    );
    expect(fieldset?.querySelector("legend")?.className).not.toContain(
      "text-xs",
    );
  });
});

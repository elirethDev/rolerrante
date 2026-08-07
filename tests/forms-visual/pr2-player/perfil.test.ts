import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { ActionData, PageData } from "../../../src/routes/perfil/$types";
import Page from "../../../src/routes/perfil/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
} from "../../../src/test/page-vision";

const profile = {
  id: "u1",
  username: "pablo",
  display_name: "Pablo",
  avatar_url: null,
  role: "player",
};

describe("perfil page (OD profile anatomy)", () => {
  it("uses OD .field markup — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/perfil/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("uses the OD .profile-layout two-column anatomy (perfil.html)", () => {
    const source = readPageSource(
      "../../../src/routes/perfil/+page.svelte",
      import.meta.url,
    );
    expect(source).toContain("profile-layout");
    expect(source).toContain("profile-side");
  });

  it("renders the 5 OD .field groups (identity 2 + change-password 3) inside .profile-layout", () => {
    const { container } = render(Page, {
      data: { profile } as unknown as PageData,
      form: {} as unknown as ActionData,
    });

    const layout = [...container.querySelectorAll<HTMLElement>("div")].find(
      (el) => el.classList.contains("profile-layout"),
    );
    expect(layout).toBeTruthy();
    expect(layout!.querySelectorAll(".form-card .field")).toHaveLength(5);
  });
});

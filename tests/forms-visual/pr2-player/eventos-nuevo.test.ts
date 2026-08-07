import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { ActionData } from "../../../src/routes/eventos/nuevo/$types";
import Page from "../../../src/routes/eventos/nuevo/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
} from "../../../src/test/page-vision";

describe("eventos/nuevo page (OD form-card anatomy)", () => {
  it("uses OD .field markup — no inline fieldset/legend markup (REQ-PF-01/FS-02)", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/eventos/nuevo/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("keeps the OD .create-wrap container (evento-nuevo.html)", () => {
    const source = readPageSource(
      "../../../src/routes/eventos/nuevo/+page.svelte",
      import.meta.url,
    );
    expect(source).toContain("create-wrap");
    expect(source).toContain('form-card');
  });

  it("renders the 6 event form fields as OD .field groups + editor section inside .create-wrap", () => {
    const { container } = render(Page, { form: {} as unknown as ActionData });

    const wrapper = [...container.querySelectorAll<HTMLElement>("div")].find(
      (el) => el.classList.contains("create-wrap"),
    );
    expect(wrapper).toBeTruthy();

    // Detalles del evento card: Título/Tipo/Máximo/Inicio/Fin/Ubicación (6).
    // The Descripción editor lives in its own form-card, not a .field group.
    expect(
      wrapper!.querySelectorAll(".form-card .field"),
    ).toHaveLength(6);
    expect(wrapper!.textContent).toContain("Descripción");
  });
});

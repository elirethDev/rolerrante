/* eslint-disable @typescript-eslint/no-explicit-any, no-unused-vars -- test props intentionally loose */
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import Page from "../../../src/routes/admin/foro/+page.svelte";

type Category = {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  min_read_role: string | null;
  requires_approval: boolean;
};

const cat = (over: Partial<Category> & { id: string; name: string }): Category => ({
  description: null,
  parent_id: null,
  sort_order: 0,
  is_visible: true,
  min_read_role: null,
  requires_approval: false,
  ...over,
});

const makeData = (over: Record<string, unknown> = {}) => ({
  categories: [
    cat({ id: "r1", name: "General" }),
    cat({ id: "r2", name: "Zona GM", min_read_role: "gm", requires_approval: true }),
    cat({ id: "s1", name: "Debates", parent_id: "r1", sort_order: 1 }),
  ],
  sectionPermissions: [],
  ...over,
});

const renderPage = (data: Record<string, unknown> = makeData()) =>
  render(Page as any, { data: data as any, form: null });

describe("admin/foro category management UI", () => {
  it("renders root and nested category names", () => {
    renderPage();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Debates")).toBeInTheDocument();
  });

  it("renders a create modal with the min-read-role select (Público/Miembro/Moderador/GM) (FORO-CAT-MINROLE)", async () => {
    renderPage();
    await fireEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    const select = document.querySelector(
      'select[name="min_read_role"]',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    const labels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(labels).toContain("Público");
    expect(labels).toContain("Miembro");
    expect(labels).toContain("Moderador");
    expect(labels).toContain("GM");
    // requires-approval toggle present in the create modal
    expect(
      document.querySelector('input[name="requires_approval"]'),
    ).toBeTruthy();
  });

  it("opens a prefilled edit modal for a category (FORO-CAT-APPR)", async () => {
    renderPage();
    // Scope to Zona GM's own row (its name label) and click its Editar button.
    const zonaRow = screen.getByText("Zona GM").closest(".border") as HTMLElement;
    const zonaEdit = zonaRow.querySelector(
      'button[aria-label="Editar"]',
    ) as HTMLButtonElement;
    expect(zonaEdit).toBeTruthy();
    await fireEvent.click(zonaEdit);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    const nameInput = dialog.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Zona GM");
    const minSelect = dialog.querySelector(
      'select[name="min_read_role"]',
    ) as HTMLSelectElement;
    expect(minSelect.value).toBe("gm");
    expect(
      (dialog.querySelector('input[name="requires_approval"]') as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("shows the requires-approval badge on the category row", () => {
    renderPage();
    // Only the category with requires_approval=true (Zona GM) shows the badge.
    const badge = screen.getByText("aprob. entrada");
    expect(badge).toBeInTheDocument();
  });

  it("renders reorder up/down controls for a sibling (FORO-CAT-REORDER)", () => {
    renderPage();
    const upButtons = screen.getAllByRole("button", { name: "Subir" });
    const downButtons = screen.getAllByRole("button", { name: "Bajar" });
    expect(upButtons.length).toBeGreaterThan(0);
    expect(downButtons.length).toBeGreaterThan(0);
  });
});

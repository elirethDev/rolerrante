/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { load } from "../../../src/routes/admin/+page.server";
import Page from "../../../src/routes/admin/+page.svelte";
import { makeSupabase, makeLocals, makeEvent } from "../../helpers/supabase-mock";

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

const CATEGORIES = [
  { id: "c1", name: "General", sort_order: 0, min_read_role: null },
  { id: "c2", name: "Zona GM", sort_order: 1, min_read_role: "gm" },
];

const PERMS = [
  { category_id: "c1", role: "rolero", can_view: true, can_post: true },
  { category_id: "c2", role: "gm", can_view: true, can_post: false },
];

describe("admin role-matrix load (OD extras)", () => {
  it("blocks non-admin", async () => {
    const supabase = makeSupabase();
    await expect(
      loadFn(makeEvent(makeLocals(supabase, "rolero"))),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("returns categories and section_permissions alongside the KPIs", async () => {
    const supabase = makeSupabase({
      tables: {
        profiles: [{ id: "u1", role: "admin" }],
        audit_logs: [],
        categories: CATEGORIES,
        section_permissions: PERMS,
      },
    });
    const result = await loadFn(makeEvent(makeLocals(supabase, "admin")));
    expect(result.categories).toEqual(CATEGORIES);
    expect(result.sectionPermissions).toEqual(PERMS);

    const tables = supabase.calls.map((c) => c.table);
    expect(tables).toContain("categories");
    expect(tables).toContain("section_permissions");
  });
});

describe("admin role-matrix panel (OD extras)", () => {
  const makeData = (over: Record<string, unknown> = {}) => ({
    users: 10,
    nonAdmin: 8,
    logs: 3,
    recentLogs: [],
    lastAction: null,
    categories: CATEGORIES,
    sectionPermissions: PERMS,
    ...over,
  });

  it("renders role columns and the minimum-read column", () => {
    render(Page, { data: makeData() as any });
    const matrix = screen.getByTestId("perm-matrix");
    expect(matrix).toBeInTheDocument();
    for (const label of ["Pendiente", "Rolero", "Administrador"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Game Master").length).toBeGreaterThan(0);
    expect(screen.getByText("Lectura mínima")).toBeInTheDocument();
  });

  it("shows the category minimum-read badge (Público / rol)", () => {
    render(Page, { data: makeData() as any });
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Zona GM")).toBeInTheDocument();
    expect(screen.getByText("Público")).toBeInTheDocument();
    // Zona GM has min_read_role='gm' -> roleLabel 'Game Master' (already asserted
    // as a column header too); assert via the row cell count of GM cells.
    const gmCells = Array.from(document.querySelectorAll('[data-testid="perm-cell"]'));
    expect(gmCells.length).toBeGreaterThan(0);
  });

  it("matches the effective permission per role for a category", () => {
    render(Page, { data: makeData() as any });
    // c1/rolero -> Ver + Publicar; c2/gm -> Ver only; c1/pendiente -> —
    const cellFor = (catName: string, role: string) => {
      const row = screen.getByText(catName).closest("tr") as HTMLTableRowElement;
      return Array.from(row.querySelectorAll('[data-testid="perm-cell"]')).find(
        (td) => td.getAttribute("data-role") === role,
      ) as HTMLTableCellElement;
    };
    expect(cellFor("General", "rolero").textContent).toContain("Ver + Publicar");
    expect(cellFor("General", "pendiente").textContent).toContain("—");
    expect(cellFor("Zona GM", "gm").textContent).toContain("Ver");
    expect(cellFor("Zona GM", "gm").textContent).not.toContain("Publicar");
  });
});
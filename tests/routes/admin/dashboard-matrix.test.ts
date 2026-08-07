/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { actions, load } from "../../../src/routes/admin/+page.server";
import Page from "../../../src/routes/admin/+page.svelte";
import { makeSupabase, makeLocals, makeEvent } from "../../helpers/supabase-mock";

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
const setPerm = actions.setSectionPerm as unknown as (...args: unknown[]) => Promise<any>;

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
  const ROLES = ["pendiente", "rolero", "gm", "admin"];

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

  it("renders role columns and the minimum-read info", () => {
    render(Page, { data: makeData() as any });
    const matrix = screen.getByTestId("perm-matrix");
    expect(matrix).toBeInTheDocument();
    // OD .perm-grid head cells carry the role columns.
    expect(matrix.querySelector(".perm-grid .head")).toBeInTheDocument();
    for (const label of ["Pendiente", "Rolero", "Administrador", "Game Master"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // Minimum-read is rendered as a per-section chip (Público when unset).
    expect(screen.getByText("Público")).toBeInTheDocument();
  });

  it("shows the category minimum-read chip (Público / rol)", () => {
    render(Page, { data: makeData() as any });
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Zona GM")).toBeInTheDocument();
    // Zona GM has min_read_role='gm' -> roleLabel 'Game Master' chip.
    expect(screen.getByText("min Game Master")).toBeInTheDocument();
    expect(screen.getByText("Público")).toBeInTheDocument();
    const gmCells = Array.from(document.querySelectorAll('[data-testid="perm-cell"]'));
    expect(gmCells.length).toBeGreaterThan(0);
  });

  it("matches the effective permission per role for a category", () => {
    render(Page, { data: makeData() as any });
    // OD .perm-grid rows are flat divs: per category → [name, role cells...].
    const grid = document.querySelector('[data-testid="perm-matrix"] .perm-grid') as HTMLElement;
    const cells = Array.from(grid.querySelectorAll(":scope > div")) as HTMLElement[];
    const firstData = cells.findIndex((c) => c.classList.contains("cell-title"));
    const cellFor = (catName: string, role: string) => {
      const idx = cells.findIndex(
        (c) => c.classList.contains("cell-title") && c.textContent?.includes(catName),
      );
      return cells[idx + 1 + ROLES.indexOf(role)];
    };
    expect(firstData).toBeGreaterThanOrEqual(0);
    // c1/rolero -> Ver + Publicar (VP); c2/gm -> Ver only (V); c1/pendiente -> -
    expect(cellFor("General", "rolero").textContent).toContain("VP");
    expect(cellFor("General", "pendiente").textContent).toContain("—");
    expect(cellFor("Zona GM", "gm").textContent).toContain("V");
    expect(cellFor("Zona GM", "gm").textContent).not.toContain("P");
  });
});

describe("admin setSectionPerm action (editable matrix cycle, OD admin.html)", () => {
  const post = (supabase: ReturnType<typeof makeSupabase>, role = "rolero", body = "categoryId=c1&role=rolero") =>
    setPerm({
      locals: makeLocals(supabase, "admin"),
      request: new Request("http://localhost/admin", {
        method: "POST",
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
      }),
      url: new URL("http://localhost/admin"),
      params: {},
    });

  const upserted = (supabase: ReturnType<typeof makeSupabase>) =>
    supabase.calls.find((c) => c.method === "upsert")?.args[0] as Record<string, unknown>;

  it("blocks non-admin", async () => {
    const supabase = makeSupabase({});
    await expect(
      setPerm({
        locals: makeLocals(supabase, "rolero"),
        request: new Request("http://localhost/admin", {
          method: "POST",
          body: "categoryId=c1&role=rolero",
          headers: { "content-type": "application/x-www-form-urlencoded" },
        }),
        url: new URL("http://localhost/admin"),
        params: {},
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("cycles none -> view -> view_post -> none persisting can_view/can_post", async () => {
    const cases: Array<
      [{ can_view: boolean; can_post: boolean } | null, { can_view: boolean; can_post: boolean }]
    > = [
      [null, { can_view: true, can_post: false }],
      [{ can_view: true, can_post: false }, { can_view: true, can_post: true }],
      [{ can_view: true, can_post: true }, { can_view: false, can_post: false }],
      [{ can_view: false, can_post: false }, { can_view: true, can_post: false }],
    ];
    for (const [current, expected] of cases) {
      const supabase = makeSupabase({
        single: current
          ? { section_permissions: { category_id: "c1", role: "rolero", ...current } as never }
          : {},
      });
      const res = await post(supabase);
      expect(res).toEqual({ success: true });
      expect(upserted(supabase).category_id).toBe("c1");
      expect(upserted(supabase).role).toBe("rolero");
      expect(upserted(supabase).can_view).toBe(expected.can_view);
      expect(upserted(supabase).can_post).toBe(expected.can_post);
    }
  });

  it("rejects an invalid role with 400", async () => {
    const supabase = makeSupabase({});
    const res = await post(supabase, "rolero", "categoryId=c1&role=nope");
    expect(res.status).toBe(400);
    expect(supabase.calls.some((c) => c.method === "upsert")).toBe(false);
  });

  it("audits the change as editar_permisos for the category", async () => {
    const logAudit = vi.fn();
    const supabase = makeSupabase({
      single: {
        section_permissions: { category_id: "c1", role: "rolero", can_view: true, can_post: true } as never,
      },
      rpc: { log_audit: logAudit },
    });
    await post(supabase);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        p_action: "editar_permisos",
        p_entity_type: "category",
        p_entity_id: "c1",
      }),
    );
  });
});

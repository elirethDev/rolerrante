import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/admin/auditoria/+page.svelte";

const logs = [
  {
    id: "1",
    created_at: "2026-01-01T00:00:00Z",
    actor: { display_name: "Pablo" },
    action: "crear_hilo",
    entity_type: "thread",
    entity_id: "t1",
    details: {},
  },
  {
    id: "2",
    created_at: "2026-01-01T00:00:00Z",
    actor: { display_name: "Ana" },
    action: "login",
    entity_type: "user",
    entity_id: "u1",
    details: {},
  },
  {
    id: "3",
    created_at: "2026-01-01T00:00:00Z",
    actor: { display_name: "Pablo" },
    action: "editar_permisos",
    entity_type: "category",
    entity_id: "c1",
    details: {},
  },
  {
    id: "4",
    created_at: "2026-01-01T00:00:00Z",
    actor: { display_name: "Ana" },
    action: "otorgar_xp",
    entity_type: "event",
    entity_id: "e1",
    details: {},
  },
];

describe("admin/auditoria forum filter (REQ-FORUM-04.4)", () => {
  it("shows all logs by default", () => {
    render(Page, { data: { logs } } as never);
    const rows = document.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(4);
  });

  it("restricts to forum actions when the forum filter is active", async () => {
    render(Page, { data: { logs } } as never);
    await fireEvent.click(screen.getByRole("button", { name: /solo foro/i }));
    const rows = document.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("crear_hilo");
    expect(rows[1].textContent).toContain("editar_permisos");
  });
});

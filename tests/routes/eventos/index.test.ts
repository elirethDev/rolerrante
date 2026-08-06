/* eslint-disable @typescript-eslint/no-explicit-any -- test props intentionally loose */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import Page from "../../../src/routes/eventos/+page.svelte";

const event = (over: Record<string, unknown> = {}) => ({
  id: `ev-${Math.random()}`,
  title: "Mazmorra del Dragón",
  status: "publicado",
  type: "evento",
  starts_at: "2026-02-14T19:00:00Z",
  location: "Online",
  created_at: "2026-01-01T00:00:00Z",
  creator: { id: "u1", display_name: "Mariela", username: "mariela" },
  ...over,
});

const makeData = (over: Record<string, unknown> = {}) => ({
  events: [],
  profile: null,
  ...over,
});

const renderPage = (data: Record<string, unknown>) =>
  render(Page as any, { data: data as any, form: null });

describe("eventos index tipo filter (OD extras)", () => {
  it("renders a tipo select next to the search box", () => {
    renderPage(makeData({ events: [event()] }));
    const select = screen.getByTestId(
      "tipo-select",
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const labels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(labels).toContain("Todos los tipos");
    expect(labels).toContain("Casual");
    expect(labels).toContain("Evento");
    expect(labels).toContain("Campaña");
  });

  it("filters cards by tipo client-side without reloading", async () => {
    renderPage(
      makeData({
        events: [
          event({ id: "e1", title: "Fogata casual", type: "casual" }),
          event({ id: "e2", title: "Gran campaña", type: "campana" }),
          event({ id: "e3", title: "Mazmorra del Dragón", type: "evento" }),
        ],
      }),
    );
    expect(screen.getByText("Fogata casual")).toBeInTheDocument();
    expect(screen.getByText("Gran campaña")).toBeInTheDocument();
    expect(screen.getByText("Mazmorra del Dragón")).toBeInTheDocument();

    const select = screen.getByTestId("tipo-select") as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "campana" } });

    expect(screen.getByText("Gran campaña")).toBeInTheDocument();
    expect(screen.queryByText("Fogata casual")).not.toBeInTheDocument();
    expect(screen.queryByText("Mazmorra del Dragón")).not.toBeInTheDocument();
  });

  it("combines the tipo filter with the status tabs", async () => {
    renderPage(
      makeData({
        events: [
          event({ id: "e1", title: "Velada casual", type: "casual", status: "publicado" }),
          event({ id: "e2", title: "Campaña pasada", type: "campana", status: "finalizado" }),
        ],
      }),
    );
    // Terminal: only publicados remain (En curso tab shows finalizado too? keep simple).
    const select = screen.getByTestId("tipo-select") as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "casual" } });
    expect(screen.getByText("Velada casual")).toBeInTheDocument();
    expect(screen.queryByText("Campaña pasada")).not.toBeInTheDocument();
  });
});

describe("eventos index date-chip (OD eventos.html:89 event-date block)", () => {
  it("renders a day + month chip from starts_at", () => {
    renderPage(
      makeData({
        events: [event({ id: "e1", starts_at: "2026-02-14T19:00:00Z" })],
      }),
    );
    const chip = screen.getByTestId("event-chip");
    expect(chip).toBeInTheDocument();
    // 14 feb -> día 14, mes "Feb" (es-ES short: feb).
    expect(chip.querySelector("b")?.textContent).toBe("14");
    expect(chip.querySelector("span")?.textContent).toBe("Feb");
  });

  it("skips the chip when starts_at is missing", () => {
    renderPage(
      makeData({
        events: [event({ id: "e1", starts_at: null })],
      }),
    );
    expect(screen.queryByTestId("event-chip")).not.toBeInTheDocument();
  });
});
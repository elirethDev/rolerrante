/* eslint-disable @typescript-eslint/no-explicit-any -- test harness intentionally loose */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/svelte";
import Page from "../../../src/routes/gm/+page.svelte";
import type { WorklistItem } from "../../../src/lib/components/gm/types";

// Capture the use:enhance submit handler so the test can resolve an approve as
// the browser/SvelteKit flow would (the repo's $app/forms test alias is inert).
const capturedEnhancers: any[] = [];

vi.mock("$app/forms", () => ({
  enhance: (node: HTMLElement, handler: unknown) => {
    // jsdom cannot perform a real form POST; keep the submit from navigating.
    node.addEventListener("submit", (e: Event) => e.preventDefault());
    capturedEnhancers.push(handler as never);
    return () => {};
  },
}));

const item = (over: Record<string, unknown> = {}): WorklistItem => ({
  id: "wl-1",
  type: "ficha",
  name: "Kareth de los Vientos",
  author: "Mariela",
  createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  stale: false,
  detailHref: "/personajes/c1",
  entityId: "c1",
  ...over,
});

const kpi = { pendientes: 1, aprobadasHoy: 0, tiempoMedio: 0, antiguedad48h: 0 };

const makeData = (over: Record<string, unknown> = {}) => ({
  queue: [item()],
  kpi,
  lastAction: null,
  ...over,
});

describe("gm page approval feedback (OD gm.html done overlay + toast)", () => {
  it("resolves an approve success into the done overlay and the success toast", async () => {
    render(Page as any, { data: makeData() as any, form: null as any });

    const form = document.querySelector("form") as HTMLFormElement;
    expect(form).toBeTruthy();

    // Clicking Aprobar posts the hidden form (sets pending + inputs)…
    await fireEvent.click(screen.getByTestId("wl-approve"));

    // …and the captured enhance handler resolves the action result.
    const resultHandler = capturedEnhancers[0]({ formElement: form });
    await act(() =>
      resultHandler({
        update: async () => ({}) as any,
        result: { type: "success", status: 200 } as any,
      }),
    );

    expect(screen.getByTestId("gm-success")).toBeInTheDocument();
    expect(screen.getByText("Aprobado — firmado en auditoría")).toBeInTheDocument();
    expect(screen.getByTestId("wl-done")).toBeInTheDocument();
    expect(screen.queryByTestId("wl-approve")).not.toBeInTheDocument();
  });

  it("does not show a success toast before any approve", () => {
    render(Page as any, { data: makeData() as any, form: null as any });
    expect(screen.queryByTestId("gm-success")).not.toBeInTheDocument();
  });
});
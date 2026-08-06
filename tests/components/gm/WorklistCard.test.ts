/* eslint-disable @typescript-eslint/no-explicit-any -- test props intentionally loose */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import WorklistCard from "../../../src/lib/components/gm/WorklistCard.svelte";
import type { WorklistItem } from "../../../src/lib/components/gm/types";

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

const renderCard = (over: Record<string, unknown> = {}) =>
  render(WorklistCard as any, { item: item(), ...over });

describe("WorklistCard GM extras (OD gm.html done + vista previa)", () => {
  it("renders a Vista previa link pointing at the entity detail", () => {
    renderCard({ item: item({ detailHref: "/historias/h1" }) });
    const link = screen.getByTestId("wl-preview") as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/historias/h1");
    // Staff action (Revisar) is kept alongside the public preview link.
    expect(screen.getByTestId("wl-review")).toBeInTheDocument();
  });

  it("shows the done overlay for an approved entity id and hides approve actions", () => {
    renderCard({ done: true });
    expect(screen.getByTestId("wl-done")).toBeInTheDocument();
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
    expect(screen.queryByTestId("wl-approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wl-reject")).not.toBeInTheDocument();
  });

  it("keeps the normal action buttons when not done", () => {
    renderCard({ done: false });
    expect(screen.queryByTestId("wl-done")).not.toBeInTheDocument();
    expect(screen.getByTestId("wl-approve")).toBeInTheDocument();
    expect(screen.getByTestId("wl-reject")).toBeInTheDocument();
  });

  it("emits onApprove on click (handler wiring untouched)", async () => {
    const onApprove = vi.fn();
    const { fireEvent } = await import("@testing-library/svelte");
    renderCard({ onApprove });
    await fireEvent.click(screen.getByTestId("wl-approve"));
    expect(onApprove).toHaveBeenCalled();
    // First arg is always the item itself.
    expect(onApprove.mock.calls[0][0]).toMatchObject({ id: "wl-1", entityId: "c1" });
  });
});
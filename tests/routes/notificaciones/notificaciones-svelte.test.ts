/* eslint-disable @typescript-eslint/no-explicit-any -- test props intentionally loose */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import Page from "../../../src/routes/notificaciones/+page.svelte";

const notif = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "new_reply",
  thread_id: "t1",
  post_id: "p1",
  actor_id: "u2",
  read_at: null,
  created_at: "2026-08-03T10:00:00Z",
  actor: { id: "u2", display_name: "Bruno", username: "bruno" },
  thread: { id: "t1", title: "El foro de pruebas" },
  ...over,
});

const makeData = (over: Record<string, unknown> = {}) => ({
  notifications: [],
  ...over,
});

// The page fires requestSubmit on mount (auto markRead); keep it from navigating
// in jsdom and spy on it so the explicit "Marcar todas" can be asserted.
const submitSpy = vi.fn<() => void>();

beforeEach(() => {
  submitSpy.mockClear();
  vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(
    submitSpy,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("notificaciones page type variety + marcar todas (OD extras)", () => {
  it("shows the per-type label for a known type and the reply message", () => {
    render(Page, {
      data: makeData({ notifications: [notif()] }) as any,
    });
    expect(screen.getByTestId("notif-type-label").textContent).toBe("Respuesta");
    expect(screen.getByText(/respondió en/)).toBeInTheDocument();
  });

  it("falls back to the generic label and message for an unknown type", () => {
    render(Page, {
      data: makeData({
        notifications: [notif({ id: "n-x", type: "mystery_kind" })],
      }) as any,
    });
    expect(screen.getByTestId("notif-type-label").textContent).toBe("Notificación");
    expect(screen.getByText("Tienes una notificación de la hermandad")).toBeInTheDocument();
    expect(screen.queryByText(/respondió en/)).not.toBeInTheDocument();
  });

  it("marks all read via the explicit Marcar todas button", async () => {
    render(Page, {
      data: makeData({
        notifications: [
          notif({ id: "n1" }),
          notif({ id: "n2", read_at: "2026-08-02T00:00:00Z" }),
        ],
      }) as any,
    });
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    await fireEvent.click(screen.getByTestId("mark-all"));
    expect(screen.getByTestId("mark-all-done")).toBeInTheDocument();
    expect(screen.queryByText("Nuevo")).not.toBeInTheDocument();
    // The button reuses the existing markRead action (server already tested).
    expect(submitSpy).toHaveBeenCalled();
  });
});
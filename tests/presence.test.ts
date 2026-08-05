import { describe, expect, it, vi, beforeEach } from "vitest";
import { startHeartbeat, type HeartbeatDeps } from "../src/lib/presence";

// RED: heartbeat scheduling (REQ-CP-03) — dependency-injected so the timing,
// pause/resume and cleanup logic is tested with fake timers and recorded deps,
// without depending on Svelte's internal effect scheduling.
describe("startHeartbeat (REQ-CP-03)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  function makeDeps(over: Partial<HeartbeatDeps> = {}) {
    const sent: string[] = [];
    const listeners = new Map<string, () => void>();
    const deps: HeartbeatDeps = {
      send: () => {
        sent.push("ping");
      },
      visibility: () => "visible",
      addEventListener: (type, handler) => {
        listeners.set(type, handler);
      },
      removeEventListener: (type) => {
        listeners.delete(type);
      },
      ...over,
    };
    return { deps, sent, listeners };
  }

  it("fires one ping immediately and then every 60s while visible (REQ-CP-03)", () => {
    const { deps, sent } = makeDeps();
    const stop = startHeartbeat(deps, 60_000);
    expect(sent).toEqual(["ping"]);
    vi.advanceTimersByTime(60_000);
    expect(sent).toEqual(["ping", "ping"]);
    vi.advanceTimersByTime(60_000);
    expect(sent).toEqual(["ping", "ping", "ping"]);
    stop();
  });

  it("does not schedule anything for guests / hidden document (REQ-CP-03)", () => {
    const { deps, sent } = makeDeps({ visibility: () => "hidden" });
    const stop = startHeartbeat(deps, 60_000);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(5 * 60_000);
    expect(sent).toEqual([]);
    stop();
  });

  it("pauses the interval when the tab becomes hidden and resumes on visible", () => {
    let state: DocumentVisibilityState = "visible";
    const { deps, sent, listeners } = makeDeps({ visibility: () => state });
    startHeartbeat(deps, 60_000);
    expect(sent).toEqual(["ping"]);

    state = "hidden";
    listeners.get("visibilitychange")!();
    const afterHidden = sent.length;
    vi.advanceTimersByTime(10 * 60_000);
    expect(sent).toHaveLength(afterHidden);

    state = "visible";
    listeners.get("visibilitychange")!();
    vi.advanceTimersByTime(60_000);
    expect(sent.length).toBeGreaterThan(afterHidden);
  });

  it("cleans up the interval on pagehide and stops sending", () => {
    const { deps, sent, listeners } = makeDeps();
    startHeartbeat(deps, 60_000);
    expect(sent).toEqual(["ping"]);
    listeners.get("pagehide")!();
    vi.advanceTimersByTime(5 * 60_000);
    expect(sent).toEqual(["ping"]);
  });

  it("cleanup removes listeners and clears the interval (destroy path)", () => {
    const { deps, sent, listeners } = makeDeps();
    const stop = startHeartbeat(deps, 60_000);
    expect(listeners.has("visibilitychange")).toBe(true);
    expect(listeners.has("online")).toBe(true);
    expect(listeners.has("pagehide")).toBe(true);
    expect(listeners.has("beforeunload")).toBe(true);
    stop();
    expect(listeners.size).toBe(0);
    const afterStop = sent.length;
    vi.advanceTimersByTime(60_000);
    expect(sent).toHaveLength(afterStop);
  });
});

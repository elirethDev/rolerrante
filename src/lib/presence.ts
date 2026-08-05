/**
 * Client heartbeat scheduling (REQ-CP-03).
 *
 * Dependency-injected so it can be unit-tested with vi.useFakeTimers and
 * recorded listeners without depending on Svelte's internal effect scheduling.
 * The landing page wires it with the browser's document/window event targets.
 *
 * Behavior:
 * - A ping is sent immediately on start, then every `intervalMs` while the tab
 *   is visible.
 * - The loop pauses while the tab is hidden (visibilitychange -> hidden) and
 *   resumes when it becomes visible again (or on the `online` event while
 *   visible).
 * - It stops on `pagehide` / `beforeunload` and clears its interval.
 * - Returns a cleanup function the caller runs on destroy.
 */

export interface HeartbeatDeps {
  /** Send one heartbeat; best-effort (fire-and-forget, catches errors internally). */
  send: () => void;
  visibility: () => DocumentVisibilityState;
  addEventListener: (type: string, handler: () => void) => void;
  removeEventListener: (type: string, handler: () => void) => void;
  /** Default to the browser globals; injectable for tests. */
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (timer: unknown) => void;
}

export function startHeartbeat(deps: HeartbeatDeps, intervalMs = 60_000): () => void {
  const setInterval =
    deps.setInterval ??
    ((fn: () => void, ms: number): unknown => globalThis.setInterval(fn, ms));
  const clearInterval =
    deps.clearInterval ??
    ((t: unknown): void => globalThis.clearInterval(t as number));
  let timer: unknown;
  let visible = deps.visibility() === 'visible';

  const ping = () => deps.send();
  const start = () => {
    if (timer !== undefined) return;
    ping();
    timer = setInterval(ping, intervalMs);
  };
  const stop = () => {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const onVisibility = () => {
    const nowVisible = deps.visibility() === 'visible';
    if (nowVisible && !visible) start();
    if (!nowVisible && visible) stop();
    visible = nowVisible;
  };
  const onOnline = () => {
    if (deps.visibility() === 'visible') start();
  };
  const onHide = () => stop();

  const handlers: Record<string, () => void> = {
    visibilitychange: onVisibility,
    online: onOnline,
    pagehide: onHide,
    beforeunload: onHide,
  };

  if (visible) start();
  for (const [type, handler] of Object.entries(handlers)) {
    deps.addEventListener(type, handler);
  }

  return () => {
    stop();
    for (const [type, handler] of Object.entries(handlers)) {
      deps.removeEventListener(type, handler);
    }
  };
}

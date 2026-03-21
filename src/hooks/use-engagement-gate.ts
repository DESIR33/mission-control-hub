import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

// ── Configuration ───────────────────────────────────────────────────────────

/** How long (ms) after the last interaction the user is still considered "active". */
const DEFAULT_INTERACTION_TTL = 5 * 60 * 1000; // 5 minutes

/** Events that count as "user interaction". */
const INTERACTION_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
];

// ── Singleton state (shared across all hook instances) ──────────────────────
// Using a module-level store avoids duplicate listeners when many components
// call useEngagementGate().

let _tabVisible = typeof document !== "undefined"
  ? document.visibilityState === "visible"
  : true;

let _lastInteraction = Date.now();
let _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

// Visibility listener
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    _tabVisible = document.visibilityState === "visible";
    _notify();
  });

  // Interaction listeners (passive, throttled via rAF)
  let _rafScheduled = false;
  const handleInteraction = () => {
    _lastInteraction = Date.now();
    if (!_rafScheduled) {
      _rafScheduled = true;
      requestAnimationFrame(() => {
        _rafScheduled = false;
        _notify();
      });
    }
  };

  INTERACTION_EVENTS.forEach((evt) => {
    document.addEventListener(evt, handleInteraction, { passive: true, capture: true });
  });
}

// useSyncExternalStore contract
function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function getSnapshot() {
  return { tabVisible: _tabVisible, lastInteraction: _lastInteraction };
}

function getServerSnapshot() {
  return { tabVisible: true, lastInteraction: Date.now() };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface EngagementGateOptions {
  /**
   * Route prefixes that count as "correct route".
   * If omitted the gate ignores route matching (always passes).
   */
  routes?: string[];
  /** Override default interaction TTL (ms). */
  interactionTtl?: number;
}

export interface EngagementGateResult {
  /** Master flag — true only when ALL conditions are met. */
  canRefresh: boolean;
  /** Individual signals for debugging / logging. */
  tabVisible: boolean;
  recentlyInteracted: boolean;
  routeMatch: boolean;
}

/**
 * Returns `canRefresh` — a single boolean that is `true` only when:
 *  1. The browser tab is visible.
 *  2. The user interacted within `interactionTtl` ms.
 *  3. (Optional) The current pathname starts with one of the supplied `routes`.
 *
 * All polling queries should gate on this value.
 */
export function useEngagementGate(
  opts: EngagementGateOptions = {},
): EngagementGateResult {
  const { routes, interactionTtl = DEFAULT_INTERACTION_TTL } = opts;

  // Subscribe to the shared singleton store
  const { tabVisible, lastInteraction } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Re-evaluate "recently interacted" on a 30-second tick so the flag
  // eventually flips to false even without new events.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const recentlyInteracted = Date.now() - lastInteraction < interactionTtl;

  // Route matching
  const routeMatch =
    !routes ||
    routes.length === 0 ||
    routes.some((r) => window.location.pathname.startsWith(r));

  const canRefresh = tabVisible && recentlyInteracted && routeMatch;

  return { canRefresh, tabVisible, recentlyInteracted, routeMatch };
}

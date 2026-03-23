import { useState, useEffect, useSyncExternalStore } from "react";

// ── Configuration ───────────────────────────────────────────────────────────

/** How long (ms) after the last interaction the user is still considered "active". */
const DEFAULT_INTERACTION_TTL = 5 * 60 * 1000; // 5 minutes

/** Events that count as "user interaction". */
const INTERACTION_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
];

// ── Singleton state (shared across all hook instances) ──────────────────────

let _tabVisible = typeof document !== "undefined"
  ? document.visibilityState === "visible"
  : true;

let _lastInteraction = Date.now();
let _recentlyInteracted = true;
let _listeners = new Set<() => void>();
let _expiryTimer: ReturnType<typeof setTimeout> | null = null;

function _notify() {
  _listeners.forEach((fn) => fn());
}

/**
 * Schedule a timer to flip _recentlyInteracted to false after TTL expires.
 * Only notifies subscribers when the boolean value actually changes.
 */
function _scheduleExpiry(ttl: number) {
  if (_expiryTimer) clearTimeout(_expiryTimer);
  const remaining = Math.max(0, ttl - (Date.now() - _lastInteraction));
  _expiryTimer = setTimeout(() => {
    const wasRecent = _recentlyInteracted;
    _recentlyInteracted = false;
    if (wasRecent) _notify();
  }, remaining + 100); // small buffer
}

if (typeof document !== "undefined") {
  // Visibility listener
  document.addEventListener("visibilitychange", () => {
    const wasVisible = _tabVisible;
    _tabVisible = document.visibilityState === "visible";
    if (wasVisible !== _tabVisible) _notify();
  });

  // Interaction listeners — only notify when boolean state changes
  let _throttled = false;
  const handleInteraction = () => {
    _lastInteraction = Date.now();
    const wasRecent = _recentlyInteracted;
    _recentlyInteracted = true;
    _scheduleExpiry(DEFAULT_INTERACTION_TTL);
    // Only notify if state changed (was false, now true)
    if (!wasRecent && !_throttled) {
      _throttled = true;
      requestAnimationFrame(() => {
        _throttled = false;
        _notify();
      });
    }
  };

  INTERACTION_EVENTS.forEach((evt) => {
    document.addEventListener(evt, handleInteraction, { passive: true, capture: true });
  });

  // Start initial expiry timer
  _scheduleExpiry(DEFAULT_INTERACTION_TTL);
}

// useSyncExternalStore contract — stable snapshots that only change on boolean state transitions
let _cachedSnapshot = { tabVisible: _tabVisible, recentlyInteracted: _recentlyInteracted };

function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function getSnapshot() {
  if (
    _cachedSnapshot.tabVisible !== _tabVisible ||
    _cachedSnapshot.recentlyInteracted !== _recentlyInteracted
  ) {
    _cachedSnapshot = { tabVisible: _tabVisible, recentlyInteracted: _recentlyInteracted };
  }
  return _cachedSnapshot;
}

const _serverSnapshot = { tabVisible: true, recentlyInteracted: true };
function getServerSnapshot() {
  return _serverSnapshot;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface EngagementGateOptions {
  routes?: string[];
  interactionTtl?: number;
}

export interface EngagementGateResult {
  canRefresh: boolean;
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
 * Optimized: only triggers re-renders when boolean state changes, not on every
 * mouse/keyboard event. This prevents cascading re-renders across the dashboard.
 */
export function useEngagementGate(
  opts: EngagementGateOptions = {},
): EngagementGateResult {
  const { routes } = opts;

  const { tabVisible, recentlyInteracted } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Route matching
  const routeMatch =
    !routes ||
    routes.length === 0 ||
    routes.some((r) => window.location.pathname.startsWith(r));

  const canRefresh = tabVisible && recentlyInteracted && routeMatch;

  return { canRefresh, tabVisible, recentlyInteracted, routeMatch };
}

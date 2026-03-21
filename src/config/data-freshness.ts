/**
 * Centralised Data-Freshness Registry
 * ────────────────────────────────────
 * Every dataset the app polls or caches is registered here with a cadence
 * class and concrete timing values.  All React-Query hooks and edge-function
 * cron triggers should import from this file instead of hard-coding intervals.
 */

// ── Cadence classes ─────────────────────────────────────────────────────────

export type CadenceClass =
  | "webhook_only"   // No polling — refreshed exclusively via realtime / webhooks
  | "daily"          // Run once per 24 h (86 400 000 ms)
  | "hourly_active"  // ≥ 60 min, only when the relevant UI is mounted & visible
  | "manual_only";   // Refresh only on explicit user action (no refetchInterval)

// ── Per-dataset config ──────────────────────────────────────────────────────

export interface DatasetFreshness {
  /** Human-readable label shown in dev tools / dashboards */
  label: string;
  cadence: CadenceClass;
  /**
   * React-Query `refetchInterval` in ms.
   * `false` means no automatic refetch (manual_only / webhook_only).
   */
  refetchInterval: number | false;
  /** React-Query `staleTime` in ms. */
  staleTime: number;
  /** Optional: adaptive interval when a sync is in-flight (e.g. 30 s). */
  activeRefetchInterval?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const ONE_HOUR = 3_600_000;
const TWO_MIN = 120_000;
const ONE_MIN = 60_000;
const FIVE_MIN = 300_000;
const TEN_MIN = 600_000;

/**
 * Hard lower-bound for any periodic refetchInterval.
 * No dataset may poll faster than once per hour.
 */
export const REFETCH_FLOOR_MS = ONE_HOUR;

// ── Registry ────────────────────────────────────────────────────────────────

export const DATA_FRESHNESS = {
  // ─── Dashboard / Polling ──────────────────────────────────────────────
  dashboardStats: {
    label: "Dashboard KPI stats",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  pollingCounts: {
    label: "Consolidated polling counts (proposals, experiments, notifs, alerts)",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  pipelineHealth: {
    label: "Pipeline health & deal stats",
    cadence: "hourly_active",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },

  // ─── YouTube Analytics ────────────────────────────────────────────────
  youtubeChannelStats: {
    label: "YouTube channel stats snapshots",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  youtubeVideoStats: {
    label: "YouTube per-video stats",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  channelAnalyticsWeekly: {
    label: "Weekly-aggregated channel analytics",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  youtubeAnalyticsApi: {
    label: "YouTube Analytics API tables (demographics, traffic, geography, devices, revenue)",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  youtubeAlerts: {
    label: "YouTube alert feed",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  youtubeComments: {
    label: "YouTube comment data",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  commentIntelligence: {
    label: "Comment sentiment & intelligence",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  commentSentiment: {
    label: "Comment sentiment analysis",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  launchMonitor: {
    label: "Recent video launch monitor",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },

  // ─── Sync Status ──────────────────────────────────────────────────────
  syncStatusLogs: {
    label: "YouTube sync log entries",
    cadence: "hourly_active",
    refetchInterval: TEN_MIN,
    staleTime: ONE_MIN,
    activeRefetchInterval: 30_000,
  },
  syncStatus: {
    label: "YouTube sync status rows",
    cadence: "hourly_active",
    refetchInterval: TEN_MIN,
    staleTime: ONE_MIN,
    activeRefetchInterval: 30_000,
  },

  // ─── CRM ──────────────────────────────────────────────────────────────
  companies: {
    label: "Companies list",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  contacts: {
    label: "Contacts list",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  deals: {
    label: "Deals pipeline",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },

  // ─── Inbox ────────────────────────────────────────────────────────────
  inbox: {
    label: "Smart inbox messages (realtime-driven)",
    cadence: "webhook_only",
    refetchInterval: false,
    staleTime: ONE_MIN,
  },
  inboxEngagement: {
    label: "Inbox engagement dashboard",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  followUpRadar: {
    label: "Follow-up radar items",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  emailSequences: {
    label: "Email sequences & steps",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },

  // ─── AI / Agents ──────────────────────────────────────────────────────
  agentExecutions: {
    label: "Agent execution log",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  activeExperiments: {
    label: "Active A/B experiments",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  strategistNotifications: {
    label: "Video strategist notifications",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  proactiveAlerts: {
    label: "Proactive alert digest",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },
  videoPerformanceAlerts: {
    label: "Video performance alerts",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },

  // ─── Content / Video Pipeline ─────────────────────────────────────────
  videoQueue: {
    label: "Video production queue",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  videoTitleMap: {
    label: "Video ID → title lookup cache",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: FIVE_MIN,
  },
  repurposes: {
    label: "Content repurpose list",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  subscriberGuides: {
    label: "Subscriber guides",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },

  // ─── Monetisation ─────────────────────────────────────────────────────
  youtubeMonetisation: {
    label: "YouTube monetisation / ad revenue",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  rateCard: {
    label: "Rate card & pricing tiers",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
  sponsoredVideos: {
    label: "Sponsored video list",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },

  // ─── Notifications ────────────────────────────────────────────────────
  notifications: {
    label: "In-app notifications",
    cadence: "hourly_active",
    refetchInterval: FIVE_MIN,
    staleTime: TWO_MIN,
  },

  // ─── Misc ─────────────────────────────────────────────────────────────
  allVideoCompanies: {
    label: "Video ↔ company link map",
    cadence: "manual_only",
    refetchInterval: false,
    staleTime: ONE_MIN,
  },
  growthGoal: {
    label: "Active growth goal",
    cadence: "daily",
    refetchInterval: false,
    staleTime: TWO_MIN,
  },
} as const satisfies Record<string, DatasetFreshness>;

// ── Convenience accessor ────────────────────────────────────────────────────

export type DatasetKey = keyof typeof DATA_FRESHNESS;

/** Clamp a refetch interval to the hard floor. */
function clampInterval(interval: number | false): number | false {
  if (interval === false) return false;
  return Math.max(interval, REFETCH_FLOOR_MS);
}

/** Shorthand: returns `{ refetchInterval, staleTime }` ready to spread into useQuery options. */
export function getFreshness(key: DatasetKey) {
  const cfg = DATA_FRESHNESS[key];
  return {
    refetchInterval: clampInterval(cfg.refetchInterval),
    staleTime: cfg.staleTime,
  } as const;
}

/**
 * Returns freshness config gated by engagement.
 * When `canRefresh` is false, polling is turned **off** (not slowed).
 */
export function getGatedFreshness(key: DatasetKey, canRefresh: boolean) {
  const cfg = DATA_FRESHNESS[key];
  const interval = clampInterval(cfg.refetchInterval);
  return {
    refetchInterval: canRefresh ? interval : false,
    staleTime: cfg.staleTime,
  } as const;
}

/**
 * For datasets with adaptive polling (e.g. sync status that polls faster
 * while a sync is in-flight), returns a clamped interval.
 * When `canRefresh` is false, returns false (off).
 */
export function getAdaptiveRefetchInterval(
  key: DatasetKey,
  isActive: boolean,
  canRefresh = true,
): number | false {
  if (!canRefresh) return false;
  const cfg = DATA_FRESHNESS[key];
  const activeInterval = (cfg as any).activeRefetchInterval as number | undefined;
  if (isActive && activeInterval) {
    return Math.max(activeInterval, REFETCH_FLOOR_MS);
  }
  return clampInterval(cfg.refetchInterval);
}

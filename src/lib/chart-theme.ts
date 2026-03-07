/**
 * Shared chart theme utilities for consistent, modern chart styling.
 * Used across all Recharts-based components in the application.
 */

/** Modern tooltip styling with glassmorphism effect */
export const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: "hsl(var(--card) / 0.95)",
  backdropFilter: "blur(8px)",
  border: "1px solid hsl(var(--border) / 0.6)",
  borderRadius: 12,
  fontSize: 12,
  padding: "10px 14px",
  boxShadow: "0 8px 32px hsl(var(--background) / 0.4)",
  lineHeight: 1.5,
};

/** Consistent axis tick style */
export const chartAxisTick = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};

/** Smaller axis tick for compact charts */
export const chartAxisTickSmall = {
  fontSize: 10,
  fill: "hsl(var(--muted-foreground))",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};

/** XAxis default props for modern look */
export const xAxisDefaults = {
  tick: chartAxisTick,
  tickLine: false,
  axisLine: { stroke: "hsl(var(--border))", strokeWidth: 1 },
  dy: 8,
} as const;

/** YAxis default props for modern look */
export const yAxisDefaults = {
  tick: chartAxisTick,
  tickLine: false,
  axisLine: false,
  dx: -4,
} as const;

/** Modern grid styling - subtle dotted grid */
export const cartesianGridDefaults = {
  strokeDasharray: "2 6",
  stroke: "hsl(var(--border) / 0.5)",
  vertical: false,
} as const;

/** Modern vibrant color palette for charts */
export const CHART_COLORS = [
  "#6366f1", // indigo
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#ec4899", // pink
  "#22c55e", // green
  "#8b5cf6", // purple
  "#f97316", // orange
  "#14b8a6", // teal
  "#ef4444", // red
  "#3b82f6", // blue
  "#84cc16", // lime
  "#a855f7", // violet
  "#0ea5e9", // sky
  "#64748b", // slate
] as const;

/** Semantic chart colors for specific data types */
export const SEMANTIC_COLORS = {
  views: "#6366f1",
  watchTime: "#8b5cf6",
  subscribers: "#22c55e",
  revenue: "#22c55e",
  impressions: "#f59e0b",
  ctr: "#f59e0b",
  engagement: "#06b6d4",
  likes: "#3b82f6",
  comments: "#14b8a6",
  shares: "#ec4899",
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#64748b",
} as const;

/** Format large numbers with K/M suffixes */
export const fmtCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

/** Format money values */
export const fmtMoney = (n: number): string => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

/** Format duration in seconds to readable string */
export const fmtDuration = (seconds: number): string => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
};

/** Compute percentage change; returns null when previous is 0 */
export const pctChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return +(((current - previous) / Math.abs(previous)) * 100).toFixed(1);
};

/** Default animation config for smooth chart transitions */
export const chartAnimationDefaults = {
  animationDuration: 800,
  animationEasing: "ease-out" as const,
};

/** Default bar chart bar styling */
export const barDefaults = {
  radius: [6, 6, 0, 0] as [number, number, number, number],
  maxBarSize: 48,
};

/** Default horizontal bar chart bar styling */
export const horizontalBarDefaults = {
  radius: [0, 6, 6, 0] as [number, number, number, number],
  maxBarSize: 32,
};

/** Pie chart default styling */
export const pieDefaults = {
  innerRadius: "55%",
  outerRadius: "85%",
  paddingAngle: 3,
  strokeWidth: 0,
  cx: "50%",
  cy: "50%",
};

/** Default line styling */
export const lineDefaults = {
  strokeWidth: 2.5,
  dot: false,
  activeDot: { r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" },
};

/** Create a gradient definition for area charts */
export function createGradientId(prefix: string): string {
  return `${prefix}Gradient`;
}

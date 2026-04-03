import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const warmthConfig: Record<string, { label: string; className: string }> = {
  cold: { label: "Cold", className: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400" },
  warming: { label: "Warming", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400" },
  warm: { label: "Warm", className: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400" },
  hot: { label: "Hot", className: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400" },
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" },
};

export function WarmthBadge({ warmth }: { warmth: string | null | undefined }) {
  if (!warmth || !warmthConfig[warmth]) return null;
  const cfg = warmthConfig[warmth];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

export function LeadScoreIndicator({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  const color =
    score >= 75 ? "text-emerald-600 dark:text-emerald-400" :
    score >= 50 ? "text-yellow-600 dark:text-yellow-400" :
    score >= 25 ? "text-orange-600 dark:text-orange-400" :
    "text-red-600 dark:text-red-400";
  return <span className={cn("text-sm font-semibold tabular-nums", color)}>{score}</span>;
}

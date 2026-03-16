import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getEngagementTier } from "@/types/subscriber";
import type { EngagementTier } from "@/types/subscriber";

const tierConfig: Record<EngagementTier, { label: string; className: string }> = {
  hot: { label: "Hot", className: "bg-destructive/15 text-destructive border-destructive/30" },
  warm: { label: "Warm", className: "bg-warning/15 text-warning border-warning/30" },
  cool: { label: "Cool", className: "bg-primary/15 text-primary border-primary/30" },
  cold: { label: "Cold", className: "bg-muted text-muted-foreground border-border" },
};

interface SubscriberEngagementBadgeProps {
  score: number;
}

export function SubscriberEngagementBadge({ score }: SubscriberEngagementBadgeProps) {
  const tier = getEngagementTier(score);
  const config = tierConfig[tier];

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label} ({score})
    </Badge>
  );
}

import { Clock, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiProposal } from "@/types/proposals";

interface ProposalStatsProps {
  proposals: AiProposal[];
}

export function ProposalStats({ proposals }: ProposalStatsProps) {
  const pending = proposals.filter((p) => p.status === "pending").length;
  const approved = proposals.filter((p) => p.status === "approved").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;

  const avgConfidence =
    proposals.length > 0
      ? proposals.reduce((sum, p) => sum + (p.confidence ?? 0), 0) /
        proposals.length
      : 0;

  const stats = [
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      className: "text-warning",
      bgClassName: "bg-warning/10",
    },
    {
      label: "Approved",
      value: approved,
      icon: CheckCircle2,
      className: "text-success",
      bgClassName: "bg-success/10",
    },
    {
      label: "Rejected",
      value: rejected,
      icon: XCircle,
      className: "text-destructive",
      bgClassName: "bg-destructive/10",
    },
    {
      label: "Avg. Confidence",
      value: `${Math.round(avgConfidence * 100)}%`,
      icon: BarChart3,
      className: "text-primary",
      bgClassName: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              stat.bgClassName
            )}
          >
            <stat.icon className={cn("w-4 h-4", stat.className)} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

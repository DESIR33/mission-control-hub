import { Mail, Phone, Video, FileText, Linkedin, Twitter, Instagram, MessageSquare, ArrowRightLeft, CheckCircle2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/crm";
import { format } from "date-fns";

const activityIcons: Record<string, { icon: typeof Mail; color: string }> = {
  email: { icon: Mail, color: "text-primary" },
  call: { icon: Phone, color: "text-success" },
  meeting: { icon: Video, color: "text-chart-4" },
  note: { icon: FileText, color: "text-muted-foreground" },
  linkedin: { icon: Linkedin, color: "text-primary" },
  twitter: { icon: Twitter, color: "text-primary" },
  instagram: { icon: Instagram, color: "text-warning" },
  message: { icon: MessageSquare, color: "text-primary" },
  deal_stage_change: { icon: ArrowRightLeft, color: "text-warning" },
  task_completed: { icon: CheckCircle2, color: "text-success" },
  other: { icon: MoreHorizontal, color: "text-muted-foreground" },
  post_engagement: { icon: MessageSquare, color: "text-chart-4" },
};

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-1">
        {activities.map((activity) => {
          const config = activityIcons[activity.activity_type] ?? activityIcons.other;
          const Icon = config.icon;

          return (
            <div key={activity.id} className="relative flex gap-3 py-2.5 pl-0 group">
              {/* Icon dot */}
              <div className="relative z-10 w-[30px] h-[30px] rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                <Icon className={cn("w-3.5 h-3.5", config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                    {activity.activity_type.replace(/_/g, " ")}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {activity.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(activity.performed_at), "MMM d, yyyy · h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReadStatusIndicatorProps {
  openedAt: string | null;
  openCount: number;
  className?: string;
}

export function ReadStatusIndicator({ openedAt, openCount, className }: ReadStatusIndicatorProps) {
  if (!openedAt && openCount === 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className={cn("inline-flex items-center gap-1 text-[10px] text-muted-foreground", className)}>
            <EyeOffIcon className="h-3 w-3" />
            Not opened
          </span>
        </TooltipTrigger>
        <TooltipContent>Recipient hasn't opened this email yet</TooltipContent>
      </Tooltip>
    );
  }

  const openedDate = openedAt ? new Date(openedAt) : null;
  const timeStr = openedDate
    ? openedDate.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={cn("inline-flex items-center gap-1 text-[10px] text-emerald-600", className)}>
          <EyeIcon className="h-3 w-3" />
          Opened{openCount > 1 ? ` ${openCount}×` : ""}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {openCount > 1
          ? `Opened ${openCount} times. First opened ${timeStr}`
          : `Opened ${timeStr}`}
      </TooltipContent>
    </Tooltip>
  );
}

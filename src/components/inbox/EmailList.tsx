import { cn } from "@/lib/utils";
import {
  MailIcon,
  PaperclipIcon,
  PinIcon,
  Loader2Icon,
} from "lucide-react";
import type { SmartEmail, EmailPriority } from "@/hooks/use-smart-inbox";
import { EmailCategoryBadge } from "./EmailCategoryBadge";

interface EmailListProps {
  emails: SmartEmail[];
  isLoading: boolean;
  selectedEmailId: string | null;
  onSelectEmail: (email: SmartEmail) => void;
  searchQuery: string;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const priorityColors: Record<EmailPriority, string> = {
  P1: "border-l-red-500",
  P2: "border-l-amber-500",
  P3: "border-l-blue-500",
  P4: "border-l-transparent",
};

const priorityBadgeColors: Record<EmailPriority, string> = {
  P1: "bg-red-500/10 text-red-700",
  P2: "bg-amber-500/10 text-amber-700",
  P3: "bg-blue-500/10 text-blue-700",
  P4: "bg-muted text-muted-foreground",
};

export default function EmailList({
  emails,
  isLoading,
  selectedEmailId,
  onSelectEmail,
  searchQuery,
}: EmailListProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-card px-4 text-center">
        <MailIcon className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">No emails found</p>
        <p className="text-xs text-muted-foreground mt-1">
          {searchQuery ? "Try adjusting your search" : "This folder is empty"}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-card">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 border-b border-border bg-card/95 backdrop-blur">
        <span className="text-xs text-muted-foreground">{emails.length} messages</span>
      </div>

      <div className="divide-y divide-border">
        {emails.map((email) => {
          const isSelected = selectedEmailId === email.id;

          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={cn(
                "flex items-start gap-3 px-3 py-3 cursor-pointer transition-all border-l-2",
                priorityColors[email.priority],
                isSelected
                  ? "bg-primary/5"
                  : "hover:bg-muted/50",
                !email.is_read && "bg-primary/[0.02]",
              )}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm truncate", !email.is_read && "font-semibold text-foreground", email.is_read && "text-muted-foreground")}>
                    {email.from_name || email.from_email}
                  </span>
                  {email.is_pinned && (
                    <PinIcon className="h-3 w-3 text-primary shrink-0" />
                  )}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0", priorityBadgeColors[email.priority])}>
                    {email.priority}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatRelativeDate(email.received_at)}
                  </span>
                </div>

                <p className={cn("text-sm truncate", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
                  {email.subject || "(No subject)"}
                </p>

                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {email.preview}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {email.has_attachments && (
                      <PaperclipIcon className="h-3 w-3 text-muted-foreground" />
                    )}
                    {email.importance === "high" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                    <EmailCategoryBadge category={(email as any).ai_category} />
                    {email.matched_contact && (
                      <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                        CRM
                      </span>
                    )}
                    {email.matched_deal && (
                      <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-700">
                        Deal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

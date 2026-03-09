import { cn } from "@/lib/utils";
import type { SmartEmail, EmailPriority } from "@/hooks/use-smart-inbox";

export type SplitCategory = "all" | "vip" | "important" | "known" | "other" | "unread";

interface SplitInboxTabsProps {
  emails: SmartEmail[];
  activeTab: SplitCategory;
  onTabChange: (tab: SplitCategory) => void;
}

const tabs: Array<{ key: SplitCategory; label: string; description: string }> = [
  { key: "all", label: "All", description: "Everything" },
  { key: "vip", label: "VIP & Deals", description: "P1 — Active deals" },
  { key: "important", label: "Important", description: "P2 — VIP contacts" },
  { key: "known", label: "Known", description: "P3 — CRM contacts" },
  { key: "other", label: "Other", description: "P4 — Unknown senders" },
  { key: "unread", label: "Unread", description: "Unread only" },
];

export function filterBySplit(emails: SmartEmail[], split: SplitCategory): SmartEmail[] {
  switch (split) {
    case "vip":
      return emails.filter((e) => e.priority === "P1");
    case "important":
      return emails.filter((e) => e.priority === "P2");
    case "known":
      return emails.filter((e) => e.priority === "P3");
    case "other":
      return emails.filter((e) => e.priority === "P4");
    case "unread":
      return emails.filter((e) => !e.is_read);
    default:
      return emails;
  }
}

function countForSplit(emails: SmartEmail[], split: SplitCategory): number {
  return filterBySplit(emails, split).length;
}

export function SplitInboxTabs({ emails, activeTab, onTabChange }: SplitInboxTabsProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const count = countForSplit(emails, tab.key);
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={tab.description}
          >
            {tab.label}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

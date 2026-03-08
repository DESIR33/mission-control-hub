import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { EmailCategoryBadge } from "./EmailCategoryBadge";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface InboxKanbanViewProps {
  emails: SmartEmail[];
  onSelectEmail: (email: SmartEmail) => void;
  selectedEmailId: string | null;
}

type KanbanColumn = "new" | "needs_response" | "waiting" | "closed";

const COLUMNS: { key: KanbanColumn; label: string; icon: React.ElementType; color: string }[] = [
  { key: "new", label: "New", icon: Inbox, color: "text-blue-500" },
  { key: "needs_response", label: "Needs Response", icon: MessageSquare, color: "text-amber-500" },
  { key: "waiting", label: "Waiting on Reply", icon: Clock, color: "text-purple-500" },
  { key: "closed", label: "Closed", icon: CheckCircle2, color: "text-green-500" },
];

function categorizeEmail(email: SmartEmail): KanbanColumn {
  if (!email.is_read) return "new";
  // If the email is from a known contact with a deal, and sent items exist, it's "waiting"
  if (email.matched_deal && email.is_read) return "waiting";
  if (email.folder === "sent" || email.folder === "archive") return "closed";
  if (email.is_read && email.matched_contact) return "needs_response";
  return "new";
}

export function InboxKanbanView({ emails, onSelectEmail, selectedEmailId }: InboxKanbanViewProps) {
  const columns = useMemo(() => {
    const grouped: Record<KanbanColumn, SmartEmail[]> = {
      new: [],
      needs_response: [],
      waiting: [],
      closed: [],
    };
    emails.forEach((e) => {
      const col = categorizeEmail(e);
      grouped[col].push(e);
    });
    return grouped;
  }, [emails]);

  return (
    <div className="grid grid-cols-4 gap-3 h-full">
      {COLUMNS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs font-semibold text-foreground">{label}</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">{columns[key].length}</Badge>
          </div>
          <ScrollArea className="flex-1 rounded-lg border border-border bg-muted/20 p-1.5">
            <div className="space-y-1.5">
              {columns[key].map((email) => (
                <Card
                  key={email.id}
                  className={`cursor-pointer transition-all hover:shadow-sm ${
                    selectedEmailId === email.id ? "ring-1 ring-primary" : ""
                  }`}
                  onClick={() => onSelectEmail(email)}
                >
                  <CardContent className="p-2.5 space-y-1">
                    <p className="text-xs font-medium truncate text-foreground">
                      {email.from_name || email.from_email}
                    </p>
                    <p className="text-xs truncate text-muted-foreground">{email.subject}</p>
                    <div className="flex items-center gap-1">
                      <EmailCategoryBadge category={(email as any).ai_category} />
                      {email.matched_deal && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-300">
                          Deal
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {columns[key].length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">No emails</p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Handshake, User, Clock, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDistanceToNow } from "date-fns";
import type { SmartEmail } from "@/hooks/use-smart-inbox";
import { safeFormat } from "@/lib/date-utils";

interface ThreadTimelineCRMProps {
  email: SmartEmail | null;
}

interface TimelineEvent {
  id: string;
  type: "email" | "deal" | "activity" | "note";
  title: string;
  description: string;
  date: string;
}

export function ThreadTimelineCRM({ email }: ThreadTimelineCRMProps) {
  const { workspaceId } = useWorkspace();
  const contactId = email?.matched_contact?.id;

  const { data: events = [] } = useQuery<TimelineEvent[]>({
    queryKey: ["thread-timeline", workspaceId, contactId, email?.conversation_id],
    queryFn: async () => {
      if (!workspaceId || !contactId) return [];
      const items: TimelineEvent[] = [];

      // Get thread emails
      if (email?.conversation_id) {
        const { data: threadEmails } = await (supabase as any)
          .from("inbox_emails")
          .select("id, subject, from_name, received_at, preview")
          .eq("workspace_id", workspaceId)
          .eq("conversation_id", email.conversation_id)
          .order("received_at", { ascending: true });

        for (const e of threadEmails || []) {
          items.push({
            id: e.id,
            type: "email",
            title: e.subject,
            description: `From ${e.from_name}: ${e.preview.slice(0, 80)}...`,
            date: e.received_at,
          });
        }
      }

      // Get related deals
      const { data: deals } = await (supabase as any)
        .from("deals")
        .select("id, title, stage, value, created_at")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      for (const d of deals || []) {
        items.push({
          id: d.id,
          type: "deal",
          title: d.title,
          description: `${d.stage} — ${d.value ? `$${d.value.toLocaleString()}` : "No value"}`,
          date: d.created_at,
        });
      }

      // Get CRM activities
      const { data: activities } = await (supabase as any)
        .from("activities")
        .select("id, title, description, activity_type, performed_at")
        .eq("workspace_id", workspaceId)
        .eq("entity_id", contactId)
        .eq("entity_type", "contact")
        .order("performed_at", { ascending: false })
        .limit(5);

      for (const a of activities || []) {
        items.push({
          id: a.id,
          type: "activity",
          title: a.title || a.activity_type,
          description: a.description || "",
          date: a.performed_at,
        });
      }

      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!workspaceId && !!contactId,
  });

  if (!email?.matched_contact) return null;

  const typeIcons: Record<string, React.ReactNode> = {
    email: <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
    deal: <Handshake className="h-3.5 w-3.5 text-green-500" />,
    activity: <FileText className="h-3.5 w-3.5 text-amber-500" />,
    note: <FileText className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Thread Timeline + CRM
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px]">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No timeline events.</p>
          ) : (
            <div className="relative pl-4 space-y-3">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
              {events.map((event) => (
                <div key={event.id} className="relative flex items-start gap-2">
                  <div className="absolute -left-4 mt-1 w-3.5 h-3.5 rounded-full bg-background border border-border flex items-center justify-center">
                    {typeIcons[event.type]}
                  </div>
                  <div className="ml-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{event.type}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{event.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {safeFormat(event.date, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

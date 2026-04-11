import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Mail, Handshake, FileText, MessageSquare, UserPlus } from "lucide-react";
import { useState } from "react";
import { useContacts, useActivities } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { safeFormat } from "@/lib/date-utils";
import { useWorkspace } from "@/hooks/use-workspace";

export function ContactLifecycleTimeline() {
  const { data: contacts = [] } = useContacts();
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const { data: activities = [] } = useActivities(selectedContactId || null);
  const { data: deals = [] } = useDeals();
  const { workspaceId } = useWorkspace();

  const { data: emails = [] } = useQuery({
    queryKey: ["lifecycle-emails", workspaceId, selectedContactId],
    queryFn: async () => {
      if (!workspaceId || !selectedContactId) return [];
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (!contact?.email) return [];
      const { data } = await supabase
        .from("inbox_emails")
        .select("id, subject, from_email, received_at")
        .eq("workspace_id", workspaceId)
        .eq("from_email", contact.email)
        .order("received_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!workspaceId && !!selectedContactId,
  });

  const contactDeals = deals.filter((d) => d.contact_id === selectedContactId);

  // Build unified timeline
  type TimelineEvent = { id: string; date: string; type: string; icon: React.ReactNode; title: string; detail?: string };
  const events: TimelineEvent[] = [];

  // Contact creation
  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  if (selectedContact) {
    events.push({
      id: "created",
      date: selectedContact.created_at,
      type: "created",
      icon: <UserPlus className="h-4 w-4 text-green-500" />,
      title: "Contact created",
      detail: selectedContact.source ? `Source: ${selectedContact.source}` : undefined,
    });
  }

  activities.forEach((a) => {
    events.push({
      id: a.id,
      date: a.performed_at,
      type: "activity",
      icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
      title: a.title || a.activity_type,
      detail: a.description || undefined,
    });
  });

  emails.forEach((e) => {
    events.push({
      id: e.id,
      date: e.received_at,
      type: "email",
      icon: <Mail className="h-4 w-4 text-amber-500" />,
      title: e.subject || "Email received",
      detail: `From: ${e.from_email}`,
    });
  });

  contactDeals.forEach((d) => {
    events.push({
      id: d.id,
      date: d.created_at,
      type: "deal",
      icon: <Handshake className="h-4 w-4 text-primary" />,
      title: `Deal: ${d.title}`,
      detail: `Stage: ${d.stage}${d.value ? ` · $${d.value.toLocaleString()}` : ""}`,
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" />
          Contact Lifecycle Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedContactId} onValueChange={setSelectedContactId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a contact..." />
          </SelectTrigger>
          <SelectContent>
            {contacts.slice(0, 50).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name || ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedContactId && events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No activity recorded</p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {events.map((event, i) => (
              <div key={event.id} className="flex gap-3 py-2">
                <div className="flex flex-col items-center">
                  <div className="p-1.5 rounded-full bg-muted">{event.icon}</div>
                  {i < events.length - 1 && <div className="w-px h-full bg-border flex-1 mt-1" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {safeFormat(event.date, "MMM d, yyyy")}
                    </span>
                  </div>
                  {event.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

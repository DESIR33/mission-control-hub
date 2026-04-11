import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Check, Mail, User, Handshake, AlertTriangle } from "lucide-react";
import { useEmailFollowUps, useCompleteFollowUp } from "@/hooks/use-email-follow-ups";
import { DistanceToNow, isPast, isToday } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

const reasonLabels: Record<string, string> = {
  no_reply: "No Reply",
  deal_stale: "Deal Stale",
  follow_up: "Follow Up",
  check_in: "Check In",
  proposal_sent: "Proposal Sent",
};

export function SmartFollowUpQueue() {
  const { data: followUps = [], isLoading } = useEmailFollowUps();
  const completeFollowUp = useCompleteFollowUp();

  const urgentItems = followUps.filter(f => f.due_date && (isPast(new Date(f.due_date)) || isToday(new Date(f.due_date))));
  const upcomingItems = followUps.filter(f => !f.due_date || (!isPast(new Date(f.due_date)) && !isToday(new Date(f.due_date))));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          Follow-Up Queue
          {urgentItems.length > 0 && (
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
              {urgentItems.length} due
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-4 pb-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No follow-ups pending.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {urgentItems.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Respond Today
                  </p>
                  {urgentItems.map((item) => (
                    <FollowUpItem key={item.id} item={item} onComplete={() => completeFollowUp.mutate(item.id)} />
                  ))}
                </div>
              )}
              {upcomingItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</p>
                  {upcomingItems.map((item) => (
                    <FollowUpItem key={item.id} item={item} onComplete={() => completeFollowUp.mutate(item.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function FollowUpItem({ item, onComplete }: { item: any; onComplete: () => void }) {
  return (
    <div className="flex items-start gap-2 py-2 px-2 rounded-md hover:bg-muted/50 mb-1 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {item.email?.subject || item.suggested_action || "Follow up needed"}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.email && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Mail className="h-2.5 w-2.5" /> {item.email.from_name || item.email.from_email}
            </span>
          )}
          {item.contact && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <User className="h-2.5 w-2.5" /> {item.contact.first_name} {item.contact.last_name}
            </span>
          )}
          {item.deal && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Handshake className="h-2.5 w-2.5" /> {item.deal.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={`text-[10px] ${priorityColors[item.priority] ?? priorityColors.medium}`}>
            {item.priority}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {reasonLabels[item.reason] ?? item.reason}
          </Badge>
          {item.due_date && (
            <span className="text-[10px] text-muted-foreground">
              {isPast(new Date(item.due_date)) ? "Overdue" : safeFormatDistanceToNow(item.due_date, { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onComplete}>
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

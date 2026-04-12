import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Check, Mail, User, Handshake, AlertTriangle, Sparkles, Reply, Zap } from "lucide-react";
import { useSmartFollowUps, SmartFollowUpItem } from "@/hooks/use-smart-follow-ups";
import { useCompleteFollowUp } from "@/hooks/use-email-follow-ups";

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Urgent" },
  medium: { color: "bg-warning/15 text-warning border-warning/30", label: "Medium" },
  low: { color: "bg-muted text-muted-foreground", label: "Low" },
};

const typeConfig: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
  unreplied_opportunity: { icon: Mail, color: "text-emerald-600", label: "Opportunity" },
  potential_opportunity: { icon: Sparkles, color: "text-amber-500", label: "Potential" },
  manual: { icon: Clock, color: "text-primary", label: "Manual" },
};

export function SmartFollowUpQueue() {
  const { data: items } = useSmartFollowUps();
  const completeFollowUp = useCompleteFollowUp();

  const highPriority = items.filter(i => i.priority === "high");
  const rest = items.filter(i => i.priority !== "high");

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          Smart Follow-Up Radar
          {highPriority.length > 0 && (
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
              {highPriority.length} urgent
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {items.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-4 pb-4">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No follow-ups pending.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {highPriority.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Needs Reply Now
                  </p>
                  {highPriority.map((item) => (
                    <FollowUpItem
                      key={item.id}
                      item={item}
                      onComplete={item.manual_follow_up_id ? () => completeFollowUp.mutate(item.manual_follow_up_id!) : undefined}
                    />
                  ))}
                </div>
              )}
              {rest.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</p>
                  {rest.map((item) => (
                    <FollowUpItem
                      key={item.id}
                      item={item}
                      onComplete={item.manual_follow_up_id ? () => completeFollowUp.mutate(item.manual_follow_up_id!) : undefined}
                    />
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

function FollowUpItem({ item, onComplete }: { item: SmartFollowUpItem; onComplete?: () => void }) {
  const cfg = typeConfig[item.type] ?? typeConfig.manual;
  const TypeIcon = cfg.icon;
  const pCfg = priorityConfig[item.priority] ?? priorityConfig.medium;

  return (
    <div className="flex items-start gap-2 py-2 px-2 rounded-md hover:bg-muted/50 mb-1 group">
      <Tooltip>
        <TooltipTrigger asChild>
          <TypeIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">{cfg.label}</TooltipContent>
      </Tooltip>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {item.subject}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
            <Mail className="h-2.5 w-2.5 shrink-0" /> {item.from_name || item.from_email}
          </span>
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
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${pCfg.color}`}>
            {pCfg.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {item.reason}
          </span>
          {item.days_waiting > 0 && (
            <span className="text-[10px] text-muted-foreground">
              · {item.days_waiting}d ago
            </span>
          )}
        </div>
        {item.suggested_action && (
          <p className="text-[10px] text-primary/70 mt-0.5 italic truncate">
            💡 {item.suggested_action}
          </p>
        )}
      </div>
      {onComplete && (
        <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onComplete}>
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

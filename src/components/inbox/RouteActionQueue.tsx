import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useInboxRouteActions,
  usePendingRouteActionCount,
  useApproveRouteAction,
  useRejectRouteAction,
  useBulkApproveRouteActions,
  type InboxRouteAction,
} from "@/hooks/use-inbox-route-actions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  UserPlus, UserCog, DollarSign, Clock, Mail,
  CheckCircle2, XCircle, AlertTriangle, Shield, Zap,
  Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { formatDistanceToNow } from "date-fns";

const actionTypeConfig: Record<string, { icon: typeof UserPlus; label: string; color: string }> = {
  create_contact: { icon: UserPlus, label: "Create Contact", color: "text-primary" },
  update_contact: { icon: UserCog, label: "Update Contact", color: "text-warning" },
  create_deal: { icon: DollarSign, label: "Create Deal", color: "text-success" },
  schedule_followup: { icon: Clock, label: "Schedule Follow-up", color: "text-primary" },
  enroll_sequence: { icon: Mail, label: "Enroll in Sequence", color: "text-destructive" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-warning/15 text-warning border-warning/30", label: "Pending" },
  approved: { color: "bg-primary/15 text-primary border-primary/30", label: "Approved" },
  executed: { color: "bg-success/15 text-success border-success/30", label: "Executed" },
  auto_executed: { color: "bg-success/15 text-success border-success/30", label: "Auto-Executed" },
  rejected: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Rejected" },
};

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-success";
  if (confidence >= 50) return "text-warning";
  return "text-destructive";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 80) return "bg-success";
  if (confidence >= 50) return "bg-warning";
  return "bg-destructive";
}

export function RouteActionQueue() {
  const [tab, setTab] = useState<string>("pending");
  const { data: actions = [], isLoading } = useInboxRouteActions(tab === "all" ? undefined : tab);
  const { data: pendingCount = 0 } = usePendingRouteActionCount();
  const approve = useApproveRouteAction();
  const reject = useRejectRouteAction();
  const bulkApprove = useBulkApproveRouteActions();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const pendingActions = useMemo(() => actions.filter(a => a.status === "pending"), [actions]);

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast({ title: "Action executed successfully" });
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync(id);
      toast({ title: "Action rejected" });
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    try {
      await bulkApprove.mutateAsync(Array.from(selected));
      toast({ title: `${selected.size} actions executed` });
      setSelected(new Set());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === pendingActions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingActions.map(a => a.id)));
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      {/* Header metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-4 h-4 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Zap className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">80+</p>
            <p className="text-[10px] text-muted-foreground">Auto-Execute Threshold</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Shield className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">&lt;80</p>
            <p className="text-[10px] text-muted-foreground">Requires Approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="h-auto gap-1">
            <TabsTrigger value="pending" className="text-xs">
              Pending {pendingCount > 0 && <Badge variant="outline" className="ml-1 text-[9px] bg-warning/15 text-warning">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="auto_executed" className="text-xs">Auto-Executed</TabsTrigger>
            <TabsTrigger value="executed" className="text-xs">Executed</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>

          {tab === "pending" && selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleBulkApprove}
                disabled={bulkApprove.isPending}
              >
                {bulkApprove.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve All
              </Button>
            </div>
          )}
        </div>

        <TabsContent value={tab} className="mt-0">
          {actions.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No {tab === "all" ? "" : tab} route actions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run inbox triage to generate route actions from email classifications
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tab === "pending" && pendingActions.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <Checkbox
                    checked={selected.size === pendingActions.length && pendingActions.length > 0}
                    onCheckedChange={selectAll}
                  />
                  <span className="text-xs text-muted-foreground">Select all</span>
                </div>
              )}

              {actions.map((action) => (
                <RouteActionCard
                  key={action.id}
                  action={action}
                  isSelected={selected.has(action.id)}
                  onToggleSelect={() => toggleSelect(action.id)}
                  onApprove={() => handleApprove(action.id)}
                  onReject={() => handleReject(action.id)}
                  isApproving={approve.isPending}
                  isExpanded={expanded === action.id}
                  onToggleExpand={() => setExpanded(expanded === action.id ? null : action.id)}
                  showCheckbox={action.status === "pending"}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RouteActionCard({
  action, isSelected, onToggleSelect, onApprove, onReject,
  isApproving, isExpanded, onToggleExpand, showCheckbox,
}: {
  action: InboxRouteAction;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showCheckbox: boolean;
}) {
  const config = actionTypeConfig[action.action_type] ?? { icon: Zap, label: action.action_type, color: "text-muted-foreground" };
  const Icon = config.icon;
  const status = statusConfig[action.status] ?? statusConfig.pending;

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/30"
    )}>
      <div className="flex items-start gap-3 p-3">
        {showCheckbox && (
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="mt-1" />
        )}

        <div className={cn("p-1.5 rounded-md bg-secondary shrink-0 mt-0.5", config.color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{config.label}</p>
            <Badge variant="outline" className={cn("text-[10px]", status.color)}>{status.label}</Badge>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <div className={cn("w-8 h-1.5 rounded-full bg-muted overflow-hidden")}>
                <div className={cn("h-full rounded-full", confidenceBg(action.confidence))} style={{ width: `${action.confidence}%` }} />
              </div>
              <span className={cn("text-[10px] font-mono", confidenceColor(action.confidence))}>
                {action.confidence}%
              </span>
            </div>
          </div>

          {action.email && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium">{action.email.from_name}</span> · {action.email.subject}
            </p>
          )}

          {action.rationale && (
            <p className="text-xs text-muted-foreground mt-1">{action.rationale}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {safeFormatDistanceToNow(action.created_at, { addSuffix: true })}
            </span>
            <button onClick={onToggleExpand} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              {isExpanded ? "Hide" : "Details"}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-2 p-2 rounded-md bg-secondary/50 text-xs font-mono text-muted-foreground">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(action.payload, null, 2)}</pre>
            </div>
          )}
        </div>

        {action.status === "pending" && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={onApprove}
              disabled={isApproving}
            >
              {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onReject}
            >
              <XCircle className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

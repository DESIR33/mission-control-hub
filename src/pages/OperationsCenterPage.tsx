import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useOperationsFeed,
  useOperationCounts,
  useApproveOperation,
  useRejectOperation,
  useRollbackOperation,
  useApprovalPolicies,
  useUpsertApprovalPolicy,
  useDeleteApprovalPolicy,
  useLiveAgentROI,
  type AutomationOperation,
  type ApprovalPolicy,
} from "@/hooks/use-operations-center";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Shield, Activity, BarChart3, Settings2, Zap,
  CheckCircle2, XCircle, RotateCcw, AlertTriangle,
  Bot, Mail, Film, DollarSign, Users,
  Loader2, ChevronDown, ChevronUp,
  Clock, TrendingUp, ShieldAlert, ShieldCheck,
  Play, Pause, Trash2,
} from "lucide-react";
import { safeFormat, safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

// ─── Constants ─────────────────────────

const domainConfig: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  inbox: { icon: Mail, label: "Inbox", color: "text-primary" },
  content: { icon: Film, label: "Content", color: "text-warning" },
  finance: { icon: DollarSign, label: "Finance", color: "text-success" },
  crm: { icon: Users, label: "CRM", color: "text-destructive" },
  growth: { icon: TrendingUp, label: "Growth", color: "text-primary" },
  general: { icon: Bot, label: "General", color: "text-muted-foreground" },
};

const riskConfig: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: "text-success", bg: "bg-success/15 border-success/30", label: "Low" },
  medium: { color: "text-warning", bg: "bg-warning/15 border-warning/30", label: "Medium" },
  high: { color: "text-destructive", bg: "bg-destructive/15 border-destructive/30", label: "High" },
  critical: { color: "text-destructive", bg: "bg-destructive/20 border-destructive/50", label: "Critical" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  proposed: { color: "bg-warning/15 text-warning border-warning/30", label: "Proposed" },
  approved: { color: "bg-primary/15 text-primary border-primary/30", label: "Approved" },
  executing: { color: "bg-primary/20 text-primary border-primary/40", label: "Executing" },
  executed: { color: "bg-success/15 text-success border-success/30", label: "Executed" },
  failed: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Failed" },
  rolled_back: { color: "bg-muted text-muted-foreground", label: "Rolled Back" },
  rejected: { color: "bg-destructive/10 text-destructive/70", label: "Rejected" },
};

// ─── Page Component ────────────────────

export default function OperationsCenterPage() {
  const [tab, setTab] = useState("feed");
  const { data: counts } = useOperationCounts();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Operations Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified view of all automated actions across agents
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Proposed", value: counts?.proposed ?? 0, icon: Clock, color: "text-warning" },
          { label: "Executing", value: counts?.executing ?? 0, icon: Play, color: "text-primary" },
          { label: "Executed", value: counts?.executed ?? 0, icon: CheckCircle2, color: "text-success" },
          { label: "Failed", value: counts?.failed ?? 0, icon: AlertTriangle, color: "text-destructive" },
          { label: "Rolled Back", value: counts?.rolled_back ?? 0, icon: RotateCcw, color: "text-muted-foreground" },
          { label: "Rejected", value: counts?.rejected ?? 0, icon: XCircle, color: "text-destructive" },
        ].map(m => (
          <Card key={m.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <m.icon className={cn("w-4 h-4 mx-auto mb-1", m.color)} />
              <p className="text-lg font-bold font-mono text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="feed" className="text-xs gap-1">
            <Activity className="w-3 h-3" /> Live Feed
            {(counts?.proposed ?? 0) > 0 && (
              <Badge variant="outline" className="text-[9px] bg-warning/15 text-warning ml-1">
                {counts?.proposed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="policies" className="text-xs gap-1">
            <Settings2 className="w-3 h-3" /> Policies
          </TabsTrigger>
          <TabsTrigger value="roi" className="text-xs gap-1">
            <BarChart3 className="w-3 h-3" /> Agent ROI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed"><OperationsFeed /></TabsContent>
        <TabsContent value="policies"><PoliciesPanel /></TabsContent>
        <TabsContent value="roi"><AgentROIPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Operations Feed ───────────────────

function OperationsFeed() {
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters = useMemo(() => ({
    domain: domainFilter !== "all" ? domainFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    risk_level: riskFilter !== "all" ? riskFilter : undefined,
  }), [domainFilter, statusFilter, riskFilter]);

  const { data: ops = [], isLoading } = useOperationsFeed(filters);
  const approve = useApproveOperation();
  const reject = useRejectOperation();
  const rollback = useRollbackOperation();
  const { toast } = useToast();

  const handleAction = async (action: "approve" | "reject" | "rollback", id: string) => {
    try {
      if (action === "approve") await approve.mutateAsync(id);
      else if (action === "reject") await reject.mutateAsync(id);
      else await rollback.mutateAsync(id);
      toast({ title: `Operation ${action}d` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Domain" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {Object.entries(domainConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            {Object.entries(riskConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{ops.length} operations</span>
      </div>

      {ops.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No operations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Automated actions from inbox triage, content agents, CRM, and finance will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ops.map(op => (
            <OperationCard
              key={op.id}
              op={op}
              isExpanded={expanded === op.id}
              onToggleExpand={() => setExpanded(expanded === op.id ? null : op.id)}
              onApprove={() => handleAction("approve", op.id)}
              onReject={() => handleAction("reject", op.id)}
              onRollback={() => handleAction("rollback", op.id)}
              isActing={approve.isPending || reject.isPending || rollback.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OperationCard({ op, isExpanded, onToggleExpand, onApprove, onReject, onRollback, isActing }: {
  op: AutomationOperation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRollback: () => void;
  isActing: boolean;
}) {
  const domain = domainConfig[op.domain] ?? domainConfig.general;
  const DomainIcon = domain.icon;
  const risk = riskConfig[op.risk_level] ?? riskConfig.low;
  const status = statusConfig[op.status] ?? statusConfig.proposed;

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      op.risk_level === "critical" ? "border-destructive/40 bg-destructive/5" :
      op.risk_level === "high" ? "border-destructive/20 bg-card" : "border-border bg-card"
    )}>
      <div className="flex items-start gap-3 p-3">
        <div className={cn("p-1.5 rounded-md bg-secondary shrink-0 mt-0.5", domain.color)}>
          <DomainIcon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{op.operation_type.replace(/_/g, " ")}</p>
            <Badge variant="outline" className={cn("text-[10px]", status.color)}>{status.label}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", risk.bg)}>{risk.label} Risk</Badge>
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", op.confidence >= 80 ? "bg-success" : op.confidence >= 50 ? "bg-warning" : "bg-destructive")}
                  style={{ width: `${op.confidence}%` }}
                />
              </div>
              <span className={cn("text-[10px] font-mono", op.confidence >= 80 ? "text-success" : op.confidence >= 50 ? "text-warning" : "text-destructive")}>
                {op.confidence}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
            <Bot className="w-3 h-3" />
            <span className="font-medium">{op.agent_slug.replace(/-/g, " ")}</span>
            {op.entity_name && (
              <><span>·</span><span>{op.entity_name}</span></>
            )}
          </div>

          {op.rationale && (
            <p className="text-xs text-muted-foreground mt-1">{op.rationale}</p>
          )}

          {op.execution_error && (
            <p className="text-xs text-destructive mt-1">Error: {op.execution_error}</p>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground">
              {safeFormatDistanceToNow(op.created_at, { addSuffix: true })}
            </span>
            {op.executed_at && (
              <span className="text-[10px] text-muted-foreground">
                · Executed {safeFormat(op.executed_at, "MMM d HH:mm")}
              </span>
            )}
            <button onClick={onToggleExpand} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              {isExpanded ? "Hide" : "Details"}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-2 space-y-2">
              <div className="p-2 rounded-md bg-secondary/50 text-xs font-mono text-muted-foreground">
                <p className="text-[10px] font-sans font-semibold text-foreground mb-1">Payload</p>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(op.payload, null, 2)}</pre>
              </div>
              {op.result && (
                <div className="p-2 rounded-md bg-success/5 text-xs font-mono text-muted-foreground">
                  <p className="text-[10px] font-sans font-semibold text-success mb-1">Result</p>
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(op.result, null, 2)}</pre>
                </div>
              )}
              {op.rollback_payload && (
                <div className="p-2 rounded-md bg-warning/5 text-xs font-mono text-muted-foreground">
                  <p className="text-[10px] font-sans font-semibold text-warning mb-1">Rollback Data</p>
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(op.rollback_payload, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {op.status === "proposed" && (
            <>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={onApprove} disabled={isActing}>
                {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onReject} disabled={isActing}>
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
          {op.status === "executed" && op.rollback_payload && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-warning" onClick={onRollback} disabled={isActing}>
              <RotateCcw className="w-3 h-3" />
              Rollback
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Policies Panel ────────────────────

function PoliciesPanel() {
  const { data: policies = [], isLoading } = useApprovalPolicies();
  const upsert = useUpsertApprovalPolicy();
  const remove = useDeleteApprovalPolicy();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Partial<ApprovalPolicy>>({
    risk_level: "low",
    auto_approve: false,
    confidence_threshold: 80,
    require_human_review: true,
    max_auto_executions_per_day: 50,
    enabled: true,
  });

  const handleSave = async () => {
    try {
      await upsert.mutateAsync(editPolicy as any);
      toast({ title: "Policy saved" });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Approval Policies</h3>
          <p className="text-xs text-muted-foreground">Define rules for auto-approving or requiring human review</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={() => setEditPolicy({
              risk_level: "low", auto_approve: false, confidence_threshold: 80,
              require_human_review: true, max_auto_executions_per_day: 50, enabled: true,
            })}>
              <Settings2 className="w-3 h-3" /> Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {editPolicy.id ? "Edit" : "New"} Approval Policy
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Agent (optional)</label>
                  <Input
                    className="h-8 text-xs mt-1"
                    placeholder="All agents"
                    value={editPolicy.agent_slug ?? ""}
                    onChange={e => setEditPolicy(p => ({ ...p, agent_slug: e.target.value || null }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Domain (optional)</label>
                  <Select
                    value={editPolicy.domain ?? "any"}
                    onValueChange={v => setEditPolicy(p => ({ ...p, domain: v === "any" ? null : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Domain</SelectItem>
                      {Object.entries(domainConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Risk Level</label>
                <Select
                  value={editPolicy.risk_level ?? "low"}
                  onValueChange={v => setEditPolicy(p => ({ ...p, risk_level: v }))}
                >
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(riskConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">
                  Confidence Threshold: {editPolicy.confidence_threshold}%
                </label>
                <Slider
                  className="mt-2"
                  value={[editPolicy.confidence_threshold ?? 80]}
                  onValueChange={([v]) => setEditPolicy(p => ({ ...p, confidence_threshold: v }))}
                  min={0} max={100} step={5}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">
                  Max Auto-Executions / Day: {editPolicy.max_auto_executions_per_day}
                </label>
                <Slider
                  className="mt-2"
                  value={[editPolicy.max_auto_executions_per_day ?? 50]}
                  onValueChange={([v]) => setEditPolicy(p => ({ ...p, max_auto_executions_per_day: v }))}
                  min={1} max={200} step={5}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Auto-Approve</label>
                <Switch
                  checked={editPolicy.auto_approve ?? false}
                  onCheckedChange={v => setEditPolicy(p => ({ ...p, auto_approve: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Require Human Review</label>
                <Switch
                  checked={editPolicy.require_human_review ?? true}
                  onCheckedChange={v => setEditPolicy(p => ({ ...p, require_human_review: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending} className="gap-1">
                {upsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Save Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {policies.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No approval policies configured</p>
            <p className="text-xs text-muted-foreground mt-1">Add policies to control how automations are approved</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {policies.map(policy => (
            <Card key={policy.id} className={cn("bg-card", !policy.enabled && "opacity-50")}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldAlert className={cn("w-4 h-4", riskConfig[policy.risk_level]?.color ?? "text-muted-foreground")} />
                  <span className="text-sm font-semibold text-foreground capitalize">{policy.risk_level} Risk</span>
                  {policy.agent_slug && <Badge variant="outline" className="text-[10px]">{policy.agent_slug}</Badge>}
                  {policy.domain && <Badge variant="outline" className="text-[10px] capitalize">{policy.domain}</Badge>}
                  <div className="ml-auto flex items-center gap-2">
                    {policy.auto_approve ? (
                      <Badge variant="outline" className="text-[10px] bg-success/15 text-success">Auto-Approve</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning">Manual Review</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] font-mono">≥{policy.confidence_threshold}%</Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">{policy.max_auto_executions_per_day}/day</Badge>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => { setEditPolicy(policy); setDialogOpen(true); }}
                    >
                      <Settings2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                      onClick={async () => {
                        await remove.mutateAsync(policy.id);
                        toast({ title: "Policy deleted" });
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agent ROI Panel ───────────────────

function AgentROIPanel() {
  const agents = useLiveAgentROI();

  if (agents.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No agent data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            As agents propose and execute automations, their ROI metrics will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Agent Performance & ROI</h3>
        <p className="text-xs text-muted-foreground">Computed from operations log</p>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Agent</TableHead>
              <TableHead className="text-xs">Domains</TableHead>
              <TableHead className="text-xs text-center">Proposed</TableHead>
              <TableHead className="text-xs text-center">Executed</TableHead>
              <TableHead className="text-xs text-center">Rejected</TableHead>
              <TableHead className="text-xs text-center">Rolled Back</TableHead>
              <TableHead className="text-xs text-center">Acceptance</TableHead>
              <TableHead className="text-xs text-center">Avg Conf.</TableHead>
              <TableHead className="text-xs text-center">Time Saved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.sort((a, b) => b.executed - a.executed).map(agent => (
              <TableRow key={agent.slug}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3 h-3 text-primary" />
                    <span className="text-sm font-medium capitalize">{agent.slug.replace(/-/g, " ")}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    {agent.domains.map(d => {
                      const dc = domainConfig[d] ?? domainConfig.general;
                      return (
                        <Badge key={d} variant="outline" className={cn("text-[10px] capitalize", dc.color)}>
                          {dc.label}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-center font-mono text-xs">{agent.proposed}</TableCell>
                <TableCell className="text-center font-mono text-xs text-success">{agent.executed}</TableCell>
                <TableCell className="text-center font-mono text-xs text-destructive">{agent.rejected}</TableCell>
                <TableCell className="text-center font-mono text-xs text-warning">{agent.rolledBack}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-mono",
                    agent.acceptanceRate >= 70 ? "text-success bg-success/10" :
                    agent.acceptanceRate >= 40 ? "text-warning bg-warning/10" :
                    "text-destructive bg-destructive/10"
                  )}>
                    {agent.acceptanceRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono text-xs">{agent.avgConfidence}%</TableCell>
                <TableCell className="text-center">
                  <span className="text-xs font-mono text-success">{agent.timeSavedMin}m</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Zap className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">
              {agents.reduce((s, a) => s + a.executed, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Total Executed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">
              {agents.reduce((s, a) => s + a.timeSavedMin, 0)}m
            </p>
            <p className="text-[10px] text-muted-foreground">Time Saved</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">
              {agents.length > 0 ? Math.round(agents.reduce((s, a) => s + a.acceptanceRate, 0) / agents.length) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">Avg Acceptance</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Bot className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">{agents.length}</p>
            <p className="text-[10px] text-muted-foreground">Active Agents</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

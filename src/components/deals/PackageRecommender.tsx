import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  usePackageExperiments,
  useResolvePackageExperiment,
  useExperimentInsights,
  type PackageExperiment,
} from "@/hooks/use-package-experiments";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Beaker, CheckCircle2, XCircle, ArrowLeftRight,
  TrendingUp, TrendingDown, BarChart3, DollarSign,
  Loader2, AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const packageStyles: Record<string, string> = {
  premium: "bg-primary/15 text-primary border-primary/30",
  standard: "bg-success/15 text-success border-success/30",
  starter: "bg-warning/15 text-warning border-warning/30",
  explorer: "bg-muted text-muted-foreground",
};

const outcomeStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  counter_offered: "bg-warning/15 text-warning border-warning/30",
};

function formatCurrency(v: number) {
  if (!v) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
}

export function PackageRecommenderPanel() {
  const [tab, setTab] = useState("insights");
  const { data: experiments = [], isLoading } = usePackageExperiments();
  const insights = useExperimentInsights();
  const resolve = useResolvePackageExperiment();
  const { toast } = useToast();

  const pending = useMemo(() => experiments.filter(e => e.outcome === "pending"), [experiments]);
  const resolved = useMemo(() => experiments.filter(e => e.outcome !== "pending"), [experiments]);

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      {/* Insights summary */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Beaker className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{insights.totalExperiments}</p>
              <p className="text-[10px] text-muted-foreground">Experiments</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{Math.round(insights.acceptRate * 100)}%</p>
              <p className="text-[10px] text-muted-foreground">Accept Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <DollarSign className="w-4 h-4 text-warning mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(insights.avgAccepted || insights.avgRecommended)}</p>
              <p className="text-[10px] text-muted-foreground">Avg Accepted Value</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{insights.valueAccuracy ?? "—"}%</p>
              <p className="text-[10px] text-muted-foreground">Value Accuracy</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-warning mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-foreground">{insights.pending}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="insights" className="text-xs">
            <BarChart3 className="w-3 h-3 mr-1" /> Insights
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending {pending.length > 0 && <Badge variant="outline" className="ml-1 text-[9px] bg-warning/15 text-warning">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          {insights ? (
            <div className="space-y-3">
              {insights.bestPackage && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground mb-1">Best Performing Package</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("capitalize", packageStyles[insights.bestPackage.name])}>
                        {insights.bestPackage.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(insights.bestPackage.rate * 100)}% acceptance rate
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {insights.topReasons.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Rejection Reasons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {insights.topReasons.map((r, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{r.reason}</span>
                        <Badge variant="outline" className="text-[10px]">{r.count}x</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {insights.avgRecommended > 0 && insights.avgAccepted > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">Pricing Calibration</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Avg Recommended</p>
                        <p className="font-mono font-bold text-foreground">{formatCurrency(insights.avgRecommended)}</p>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Avg Accepted</p>
                        <p className="font-mono font-bold text-foreground">{formatCurrency(insights.avgAccepted)}</p>
                      </div>
                      <div className="ml-auto">
                        {insights.avgAccepted >= insights.avgRecommended ? (
                          <Badge variant="outline" className="text-[10px] bg-success/15 text-success">
                            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                            Under-pricing
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning">
                            <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                            Over-pricing by {Math.round((1 - insights.avgAccepted / insights.avgRecommended) * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!insights.totalExperiments && (
                <Card className="bg-card border-border">
                  <CardContent className="py-8 text-center">
                    <Beaker className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No experiment data yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Track package outcomes from the opportunity board to improve recommendations
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <Beaker className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No experiment data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Track package outcomes from the opportunity board to improve recommendations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending experiments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {pending.map(exp => (
                <ExperimentCard key={exp.id} experiment={exp} onResolve={async (data) => {
                  try {
                    await resolve.mutateAsync(data);
                    toast({ title: `Package ${data.outcome}` });
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  }
                }} isResolving={resolve.isPending} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-2">
            {resolved.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No resolved experiments</p>
                </CardContent>
              </Card>
            ) : resolved.map(exp => (
              <div key={exp.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{exp.company_name}</p>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", packageStyles[exp.recommended_package])}>
                    {exp.recommended_package}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{formatCurrency(exp.recommended_value)}</span>
                  <Badge variant="outline" className={cn("text-[10px] capitalize ml-auto", outcomeStyles[exp.outcome])}>
                    {exp.outcome.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                  {exp.accepted_package && exp.accepted_package !== exp.recommended_package && (
                    <span>Accepted as: <strong className="capitalize">{exp.accepted_package}</strong></span>
                  )}
                  {exp.accepted_value && <span>at {formatCurrency(exp.accepted_value)}</span>}
                  {exp.rejection_reason && <span className="text-destructive">Reason: {exp.rejection_reason}</span>}
                  <span className="ml-auto">{formatDistanceToNow(new Date(exp.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExperimentCard({ experiment: exp, onResolve, isResolving }: {
  experiment: PackageExperiment;
  onResolve: (data: any) => void;
  isResolving: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [outcome, setOutcome] = useState<string>("accepted");
  const [rejectionReason, setRejectionReason] = useState("");
  const [acceptedPackage, setAcceptedPackage] = useState(exp.recommended_package);
  const [acceptedValue, setAcceptedValue] = useState(String(exp.recommended_value));
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onResolve({
      id: exp.id,
      outcome,
      rejection_reason: outcome === "rejected" ? rejectionReason : undefined,
      accepted_package: outcome !== "rejected" ? acceptedPackage : undefined,
      accepted_value: outcome !== "rejected" ? Number(acceptedValue) : undefined,
      outcome_notes: notes || undefined,
    });
    setDialogOpen(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{exp.company_name}</p>
            <Badge variant="outline" className={cn("text-[10px] capitalize", packageStyles[exp.recommended_package])}>
              {exp.recommended_package}
            </Badge>
            <span className="text-xs font-mono font-bold text-foreground">{formatCurrency(exp.recommended_value)}</span>
          </div>
          {exp.package_rationale && (
            <p className="text-xs text-muted-foreground mb-1">{exp.package_rationale}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span>Match: {exp.match_score}pt</span>
            {exp.past_deal_count > 0 && <span>{exp.past_deal_count} past deals</span>}
            {exp.channel_subscribers > 0 && <span>{(exp.channel_subscribers / 1000).toFixed(0)}K subs</span>}
            <span>{exp.sponsor_vertical}</span>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs gap-1 shrink-0">
              <Beaker className="w-3 h-3" /> Record Outcome
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-sm">Record Package Outcome — {exp.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Outcome</label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="counter_offered">Counter-Offered</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {outcome === "rejected" && (
                <div>
                  <label className="text-xs font-medium text-foreground">Rejection Reason</label>
                  <Select value={rejectionReason} onValueChange={setRejectionReason}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_too_high">Price too high</SelectItem>
                      <SelectItem value="wrong_package_tier">Wrong package tier</SelectItem>
                      <SelectItem value="budget_constraints">Budget constraints</SelectItem>
                      <SelectItem value="timing_mismatch">Timing mismatch</SelectItem>
                      <SelectItem value="audience_mismatch">Audience mismatch</SelectItem>
                      <SelectItem value="competitor_chosen">Chose competitor</SelectItem>
                      <SelectItem value="no_response">No response</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {outcome !== "rejected" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-foreground">Accepted Package</label>
                    <Select value={acceptedPackage} onValueChange={setAcceptedPackage}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="explorer">Explorer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Accepted Value ($)</label>
                    <Input
                      type="number"
                      className="h-8 text-xs mt-1"
                      value={acceptedValue}
                      onChange={e => setAcceptedValue(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">Notes</label>
                <Textarea
                  className="text-xs mt-1 min-h-[60px]"
                  placeholder="Any additional context..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={handleSubmit} disabled={isResolving} className="gap-1">
                {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Save Outcome
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

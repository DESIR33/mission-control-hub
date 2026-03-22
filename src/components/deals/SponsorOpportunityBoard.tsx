import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useSponsorOpportunityBoard,
  useGenerateOpportunityBoard,
  useUpdateOpportunityStatus,
  useTaxonomyMappings,
  useSeedTaxonomy,
  type SponsorOpportunity,
} from "@/hooks/use-sponsor-opportunity-board";
import {
  useSmartPackageRecommender,
  useCreatePackageExperiment,
} from "@/hooks/use-package-experiments";
import { PackageRecommenderPanel } from "@/components/deals/PackageRecommender";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Target, Calendar, DollarSign, TrendingUp, Sparkles,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, Layers,
  Building2, Clock, Award, Zap, Beaker,
} from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-warning/15 text-warning border-warning/30",
  responded: "bg-success/15 text-success border-success/30",
  passed: "bg-destructive/15 text-destructive border-destructive/30",
};

const packageStyles: Record<string, string> = {
  premium: "bg-primary/15 text-primary border-primary/30",
  standard: "bg-success/15 text-success border-success/30",
  starter: "bg-warning/15 text-warning border-warning/30",
  explorer: "bg-muted text-muted-foreground",
};

const weekLabels: Record<number, string> = {
  1: "Week 1 (Early)",
  2: "Week 2 (Mid)",
  3: "Week 3 (Late)",
  4: "Week 4 (End)",
};

function formatCurrency(value: number) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export function SponsorOpportunityBoard() {
  const [monthOffset, setMonthOffset] = useState(0);
  const targetMonth = addMonths(startOfMonth(new Date()), monthOffset);
  const { data: opportunities = [], isLoading } = useSponsorOpportunityBoard(targetMonth);
  const generate = useGenerateOpportunityBoard();
  const updateStatus = useUpdateOpportunityStatus();
  const recommend = useSmartPackageRecommender();
  const createExperiment = useCreatePackageExperiment();
  const { data: taxonomy = [] } = useTaxonomyMappings();
  const seedTaxonomy = useSeedTaxonomy();
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      // Seed taxonomy if empty
      if (taxonomy.length === 0) {
        await seedTaxonomy.mutateAsync();
      }
      const result = await generate.mutateAsync(targetMonth);
      toast({ title: "Board generated", description: `${result.generated} opportunities for ${format(targetMonth, "MMMM yyyy")}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Group by outreach week
  const byWeek = useMemo(() => {
    const grouped: Record<number, SponsorOpportunity[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const opp of opportunities) {
      const week = Math.min(opp.suggested_outreach_week, 4);
      (grouped[week] ??= []).push(opp);
    }
    return grouped;
  }, [opportunities]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalPipeline = opportunities.reduce((s, o) => s + o.avg_deal_value, 0);
    const avgMatch = opportunities.length > 0 ? Math.round(opportunities.reduce((s, o) => s + o.match_score, 0) / opportunities.length) : 0;
    const premiumCount = opportunities.filter(o => o.suggested_package === "premium").length;
    const contacted = opportunities.filter(o => o.outreach_status !== "pending").length;
    return { totalPipeline, avgMatch, premiumCount, contacted, total: opportunities.length };
  }, [opportunities]);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold text-foreground min-w-[120px] text-center">
            {format(targetMonth, "MMMM yyyy")}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generate.isPending || seedTaxonomy.isPending}
          className="gap-1.5"
        >
          {generate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Generate Board
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Target className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">{metrics.total}</p>
            <p className="text-[10px] text-muted-foreground">Opportunities</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">{metrics.avgMatch}</p>
            <p className="text-[10px] text-muted-foreground">Avg Match Score</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Award className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">{metrics.premiumCount}</p>
            <p className="text-[10px] text-muted-foreground">Premium Targets</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <DollarSign className="w-4 h-4 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold font-mono text-foreground">{formatCurrency(metrics.totalPipeline)}</p>
            <p className="text-[10px] text-muted-foreground">Est. Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {opportunities.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No opportunities for {format(targetMonth, "MMMM yyyy")}</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Generate Board" to analyze your CRM and create sponsor opportunities</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="timeline" className="space-y-3">
          <TabsList className="h-auto gap-1">
            <TabsTrigger value="timeline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs">
              <Layers className="w-3 h-3 mr-1" /> Full List
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="text-xs">
              <Zap className="w-3 h-3 mr-1" /> Taxonomy
            </TabsTrigger>
            <TabsTrigger value="experiments" className="text-xs">
              <Beaker className="w-3 h-3 mr-1" /> Experiments
            </TabsTrigger>
          </TabsList>

          {/* Timeline View */}
          <TabsContent value="timeline">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((week) => {
                const weekOpps = byWeek[week] ?? [];
                if (weekOpps.length === 0) return null;
                return (
                  <Card key={week} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {weekLabels[week]}
                        <Badge variant="outline" className="text-[10px] ml-auto">{weekOpps.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {weekOpps.map((opp) => (
                          <OpportunityCard key={opp.id} opp={opp} onStatusChange={updateStatus.mutate} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Full List */}
          <TabsContent value="list">
            <Card className="bg-card border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>Avg Deal</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Outreach</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {opp.company_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{opp.sponsor_vertical}</TableCell>
                      <TableCell>
                        <ScoreBadge score={opp.match_score} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{opp.historical_win_rate}%</TableCell>
                      <TableCell className="text-xs font-mono">{formatCurrency(opp.avg_deal_value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] capitalize", packageStyles[opp.suggested_package])}>
                          {opp.suggested_package}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">Week {opp.suggested_outreach_week}</TableCell>
                      <TableCell>
                        <Select
                          value={opp.outreach_status}
                          onValueChange={(v) => updateStatus.mutate({ id: opp.id, status: v })}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="responded">Responded</SelectItem>
                            <SelectItem value="passed">Passed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Taxonomy View */}
          <TabsContent value="taxonomy">
            <TaxonomyView taxonomy={taxonomy} onSeed={() => seedTaxonomy.mutateAsync()} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OpportunityCard({ opp, onStatusChange }: { opp: SponsorOpportunity; onStatusChange: (p: { id: string; status: string }) => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-sm font-semibold text-foreground truncate">{opp.company_name}</p>
          <ScoreBadge score={opp.match_score} />
          <Badge variant="outline" className={cn("text-[10px] capitalize ml-auto shrink-0", packageStyles[opp.suggested_package])}>
            {opp.suggested_package}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1.5">{opp.package_rationale}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" /> {opp.sponsor_vertical}
          </span>
          <span>{opp.content_categories.join(", ")}</span>
          {opp.past_deal_count > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5" /> {opp.past_deal_count} past deals · {formatCurrency(opp.total_past_revenue)} revenue
            </span>
          )}
          <span>Win rate: {opp.historical_win_rate}%</span>
        </div>
      </div>
      <Select
        value={opp.outreach_status}
        onValueChange={(v) => onStatusChange({ id: opp.id, status: v })}
      >
        <SelectTrigger className="h-7 text-[10px] w-[100px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="contacted">Contacted</SelectItem>
          <SelectItem value="responded">Responded</SelectItem>
          <SelectItem value="passed">Passed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70
    ? "bg-success/15 text-success border-success/30"
    : score >= 40
    ? "bg-warning/15 text-warning border-warning/30"
    : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={cn("text-[10px] font-mono shrink-0", color)}>{score}pt</Badge>;
}

function TaxonomyView({ taxonomy, onSeed }: { taxonomy: any[]; onSeed: () => void }) {
  // Group by content_category
  const grouped = useMemo(() => {
    const map = new Map<string, { vertical: string; affinity: number }[]>();
    for (const t of taxonomy) {
      const arr = map.get(t.content_category) ?? [];
      arr.push({ vertical: t.sponsor_vertical, affinity: t.affinity_score });
      map.set(t.content_category, arr);
    }
    return map;
  }, [taxonomy]);

  if (taxonomy.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No taxonomy mappings yet</p>
          <Button size="sm" variant="outline" onClick={onSeed}>
            <Sparkles className="w-3 h-3 mr-1" /> Seed Default Taxonomy
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Content → Sponsor Taxonomy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(grouped.entries()).map(([category, verticals]) => (
            <div key={category} className="p-3 rounded-lg border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">{category}</p>
              <div className="space-y-1">
                {verticals.sort((a, b) => b.affinity - a.affinity).map((v) => (
                  <div key={v.vertical} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{v.vertical}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            v.affinity >= 80 ? "bg-success" : v.affinity >= 60 ? "bg-warning" : "bg-muted-foreground"
                          )}
                          style={{ width: `${v.affinity}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{v.affinity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

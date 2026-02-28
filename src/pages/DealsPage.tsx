import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddDealDialog } from "@/components/deals/AddDealDialog";
import { DealDetailSheet } from "@/components/deals/DealDetailSheet";
import { useDeals, useUpdateDeal } from "@/hooks/use-deals";
import { useActivities } from "@/hooks/use-contacts";
import { useToast } from "@/hooks/use-toast";
import { LayoutGrid, List, DollarSign, TrendingUp, Building2, User2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Deal, DealStage } from "@/types/crm";

const STAGES: { id: DealStage; label: string; color: string; weight: number }[] = [
  { id: "prospecting", label: "Prospecting", color: "#3B82F6", weight: 0.1 },
  { id: "qualification", label: "Qualification", color: "#6366F1", weight: 0.25 },
  { id: "proposal", label: "Proposal", color: "#8B5CF6", weight: 0.5 },
  { id: "negotiation", label: "Negotiation", color: "#F59E0B", weight: 0.75 },
  { id: "closed_won", label: "Closed Won", color: "#10B981", weight: 1.0 },
  { id: "closed_lost", label: "Closed Lost", color: "#EF4444", weight: 0 },
];

const stageColors: Record<string, string> = {
  prospecting: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  qualification: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  proposal: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  negotiation: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  closed_won: "bg-success/15 text-success border-success/30",
  closed_lost: "bg-destructive/15 text-destructive border-destructive/30",
};

function DealsContent() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: deals = [], isLoading } = useDeals();
  const { data: dealActivities = [] } = useActivities(selectedDeal?.id ?? null, "deal");
  const updateDeal = useUpdateDeal();
  const { toast } = useToast();

  const handleSelectDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setSheetOpen(true);
  };

  // Pipeline metrics
  const { totalPipeline, weightedForecast } = useMemo(() => {
    let total = 0;
    let weighted = 0;

    for (const deal of deals) {
      if (deal.stage !== "closed_lost") {
        const value = deal.value ?? 0;
        total += value;
        const stageInfo = STAGES.find((s) => s.id === deal.stage);
        weighted += value * (stageInfo?.weight ?? 0);
      }
    }

    return { totalPipeline: total, weightedForecast: weighted };
  }, [deals]);

  // Group deals by stage for kanban
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    for (const stage of STAGES) {
      grouped[stage.id] = [];
    }
    for (const deal of deals) {
      if (deal.stage in grouped) {
        grouped[deal.stage].push(deal);
      } else {
        grouped.prospecting.push(deal);
      }
    }
    return grouped;
  }, [deals]);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    try {
      const updates: Record<string, unknown> = { id: dealId, stage: newStage };
      if (newStage === "closed_won" || newStage === "closed_lost") {
        updates.closed_at = new Date().toISOString();
      }
      await updateDeal.mutateAsync(updates as any);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatCurrency = (value: number | null, currency?: string | null) => {
    if (value == null) return "--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-6 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn("rounded-r-none h-8", view === "kanban" && "bg-muted")}
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("rounded-l-none h-8", view === "list" && "bg-muted")}
              onClick={() => setView("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <AddDealDialog />
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(totalPipeline)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {deals.filter((d) => d.stage !== "closed_lost").length} active deals
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Weighted Forecast</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(weightedForecast)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on stage probability
          </p>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage[stage.id] ?? [];
            const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

            return (
              <div
                key={stage.id}
                className="border rounded-lg p-3 bg-muted/30 min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-medium text-xs truncate">{stage.label}</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  {formatCurrency(stageTotal)}
                </p>

                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onClick={() => handleSelectDeal(deal)}
                      className="p-2.5 rounded-lg border bg-card hover:border-primary cursor-pointer transition-colors"
                    >
                      <h4 className="text-xs font-medium leading-tight mb-1 line-clamp-2">
                        {deal.title}
                      </h4>
                      {deal.value != null && (
                        <p className="text-xs font-semibold text-primary mb-1.5">
                          {formatCurrency(deal.value, deal.currency)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {deal.company && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={deal.company.name}>
                            <Building2 className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[60px]">{deal.company.name}</span>
                          </div>
                        )}
                        {deal.contact && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`${deal.contact.first_name} ${deal.contact.last_name ?? ""}`}>
                            <User2 className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[60px]">{deal.contact.first_name}</span>
                          </div>
                        )}
                        {deal.expected_close_date && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{format(new Date(deal.expected_close_date), "MMM d")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-6">
                      No deals
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Expected Close</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No deals yet. Create your first deal to get started.
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectDeal(deal)}
                  >
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell className="font-semibold">
                      {deal.value != null ? formatCurrency(deal.value, deal.currency) : "--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", stageColors[deal.stage])}>
                        {STAGES.find((s) => s.id === deal.stage)?.label ?? deal.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name ?? ""}`.trim() : "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {deal.company?.name ?? "--"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {deal.expected_close_date ? format(new Date(deal.expected_close_date), "MMM d, yyyy") : "--"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {format(new Date(deal.updated_at), "MMM d")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Deal Detail Sheet */}
      <DealDetailSheet
        deal={selectedDeal}
        activities={dealActivities}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeleted={() => setSelectedDeal(null)}
      />
    </div>
  );
}

export default function DealsPage() {
  return <DealsContent />;
}

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Handshake,
  LayoutGrid,
  List,
  Building2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { useDeals, useUpdateDeal, type Deal, type DealStage } from "@/hooks/use-deals";
import { DealCard } from "@/components/deals/DealCard";
import { AddDealDialog } from "@/components/deals/AddDealDialog";
import { DealDetailSheet, STAGE_CONFIG } from "@/components/deals/DealDetailSheet";
import { useToast } from "@/hooks/use-toast";

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: "prospecting", label: "Prospecting", color: "#6B7280" },
  { id: "qualification", label: "Qualification", color: "#3B82F6" },
  { id: "proposal", label: "Proposal", color: "#6366F1" },
  { id: "negotiation", label: "Negotiation", color: "#F59E0B" },
  { id: "closed_won", label: "Closed Won", color: "#10B981" },
  { id: "closed_lost", label: "Closed Lost", color: "#EF4444" },
];

const WEIGHT: Record<DealStage, number> = {
  prospecting: 0.1,
  qualification: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  closed_won: 1.0,
  closed_lost: 0,
};

function DealsContent() {
  const { data: deals = [], isLoading } = useDeals();
  const updateDeal = useUpdateDeal();
  const { toast } = useToast();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = deals;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.company?.name.toLowerCase().includes(q) ||
          `${d.contact?.first_name ?? ""} ${d.contact?.last_name ?? ""}`.toLowerCase().includes(q)
      );
    }
    if (stageFilter !== "all") {
      result = result.filter((d) => d.stage === stageFilter);
    }
    return result;
  }, [deals, search, stageFilter]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    for (const s of STAGES) grouped[s.id] = [];
    for (const d of filtered) {
      if (grouped[d.stage]) grouped[d.stage].push(d);
      else grouped.prospecting.push(d);
    }
    return grouped;
  }, [filtered]);

  const pipelineValue = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== "closed_lost" && d.stage !== "closed_won")
        .reduce((sum, d) => sum + (d.value ?? 0), 0),
    [deals]
  );

  const weightedForecast = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== "closed_lost")
        .reduce((sum, d) => sum + (d.value ?? 0) * (WEIGHT[d.stage] ?? 0), 0),
    [deals]
  );

  const handleDrop = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("dealId");
    if (!dealId) return;
    const closedAt =
      stage === "closed_won" || stage === "closed_lost"
        ? new Date().toISOString()
        : null;
    updateDeal.mutate(
      { id: dealId, stage, closed_at: closedAt },
      {
        onSuccess: () =>
          toast({ title: `Deal moved to ${STAGE_CONFIG[stage].label}` }),
        onError: (err) =>
          toast({
            title: "Move failed",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  const openDetail = (deal: Deal) => {
    setSelectedDeal(deal);
    setDetailOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col pb-20 sm:pb-0">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-foreground" />
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Deal Pipeline
              </h1>
              <p className="text-xs text-muted-foreground">
                Track sponsor & partnership deals from prospect to close.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            {
              label: "Open Pipeline",
              value: `$${pipelineValue.toLocaleString()}`,
            },
            {
              label: "Weighted Forecast",
              value: `$${Math.round(weightedForecast).toLocaleString()}`,
            },
            { label: "Total Deals", value: String(deals.length) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs"
            >
              <span className="font-semibold text-foreground font-mono">
                {stat.value}
              </span>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Filters */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.04)] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-10 w-[165px] rounded-xl border-border bg-background text-sm">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1">
            <button
              className={cn(
                "rounded-lg p-2",
                view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setView("kanban")}
              title="Kanban view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(
                "rounded-lg p-2",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setView("list")}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="min-h-0 flex-1 overflow-auto bg-muted/10 p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STAGES.map((s) => (
              <div key={s.id} className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ))}
          </div>
        ) : view === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 min-w-0">
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                className="border rounded-lg p-3 bg-muted/30 min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-medium text-xs">{stage.label}</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {dealsByStage[stage.id]?.length || 0}
                  </span>
                </div>

                <div className="space-y-2">
                  {dealsByStage[stage.id]?.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => openDetail(deal)}
                    />
                  ))}
                  {(!dealsByStage[stage.id] ||
                    dealsByStage[stage.id].length === 0) && (
                    <p className="text-[10px] text-muted-foreground text-center py-6">
                      No deals
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <Handshake className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search || stageFilter !== "all"
                    ? "No deals match your current filters."
                    : "No deals yet. Create your first deal to get started."}
                </p>
                {!search && stageFilter === "all" && (
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Deal
                  </Button>
                )}
              </div>
            ) : (
              filtered.map((deal) => {
                const cfg = STAGE_CONFIG[deal.stage];
                return (
                  <div
                    key={deal.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50 cursor-pointer"
                    onClick={() => openDetail(deal)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">
                          {deal.title}
                        </h3>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                            cfg.color
                          )}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {deal.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {deal.company.name}
                          </span>
                        )}
                        {deal.expected_close_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(deal.expected_close_date),
                              "MMM d"
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {deal.value != null && (
                      <span className="text-sm font-mono font-semibold text-foreground flex items-center gap-1 shrink-0">
                        <DollarSign className="h-3.5 w-3.5" />
                        {deal.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <AddDealDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <DealDetailSheet
        deal={selectedDeal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default function DealsPage() {
  return (
    <WorkspaceProvider>
      <DealsContent />
    </WorkspaceProvider>
  );
}

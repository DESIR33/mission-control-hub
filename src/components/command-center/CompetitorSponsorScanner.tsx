import { useState, useMemo } from "react";
import {
  Search, RefreshCw, ExternalLink, Handshake, X, ChevronRight,
  Eye, EyeOff, Megaphone, Users, TrendingUp, AlertCircle, Lightbulb,
  CheckSquare, Square, MinusSquare, Mail,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCompetitorSponsors, useScanCompetitorSponsors,
  useUpdateSponsorStatus, useDismissSponsor, useCreateDealFromSponsor,
  useBulkUpdateSponsorStatus, useBulkCreateDealsFromSponsors, useBulkDismissSponsors,
  type CompetitorSponsor,
} from "@/hooks/use-competitor-sponsors";
import { SponsorOutreachDialog } from "./SponsorOutreachDialog";
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_contacted: { label: "Not Contacted", className: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", className: "bg-blue-500/20 text-blue-400" },
  in_pipeline: { label: "In Pipeline", className: "bg-green-500/20 text-green-400" },
  declined: { label: "Declined", className: "bg-red-500/20 text-red-400" },
};

const METHOD_LABELS: Record<string, string> = {
  regex: "Pattern Match",
  ai: "AI Detected",
  url_extraction: "URL Detected",
};

function SponsorCard({
  sponsor,
  onStatusChange,
  onDismiss,
  onCreateDeal,
  isCreatingDeal,
  isSelected,
  onToggleSelect,
}: {
  sponsor: CompetitorSponsor;
  onStatusChange: (id: string, status: string) => void;
  onDismiss: (id: string) => void;
  onCreateDeal: (sponsor: CompetitorSponsor) => void;
  isCreatingDeal: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const status = STATUS_CONFIG[sponsor.outreach_status] || STATUS_CONFIG.not_contacted;
  const methods = sponsor.detection_method.split(",");
  const channelCount = sponsor.competitor_channels?.length || 0;
  const isHighValue = channelCount >= 2 || sponsor.mention_count >= 3;

  return (
    <Card className={`transition-colors ${isHighValue ? "border-primary/30" : ""} ${isSelected ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-start gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(sponsor.id)}
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {sponsor.sponsor_name}
                </h4>
                {isHighValue && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Hot Lead
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {methods.map((m) => (
                  <span key={m} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {METHOD_LABELS[m] || m}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {sponsor.sponsor_url && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={sponsor.sponsor_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDismiss(sponsor.id)}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">{sponsor.mention_count}</span>
            <span className="text-[10px] text-muted-foreground">mentions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">{channelCount}</span>
            <span className="text-[10px] text-muted-foreground">competitors</span>
          </div>
        </div>

        {/* Competitor channels */}
        {sponsor.competitor_channels?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sponsor.competitor_channels.slice(0, 4).map((ch) => (
              <Badge key={ch} variant="secondary" className="text-[10px] h-5">{ch}</Badge>
            ))}
            {sponsor.competitor_channels.length > 4 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                +{sponsor.competitor_channels.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Outreach suggestion */}
        {sponsor.outreach_suggestion && sponsor.outreach_status === "not_contacted" && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5">
            <div className="flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-relaxed">{sponsor.outreach_suggestion}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className={`${status.className} border-transparent text-[10px]`}>
            {status.label}
          </Badge>
          <div className="flex items-center gap-1.5">
            {sponsor.outreach_status === "not_contacted" && !sponsor.deal_id && (
              <Button
                size="sm" variant="default" className="h-7 text-xs gap-1"
                onClick={() => onCreateDeal(sponsor)}
                disabled={isCreatingDeal}
              >
                <Handshake className="w-3 h-3" />
                {isCreatingDeal ? "Creating…" : "Create Deal"}
              </Button>
            )}
            <Select
              value={sponsor.outreach_status}
              onValueChange={(v) => onStatusChange(sponsor.id, v)}
            >
              <SelectTrigger className="h-7 w-auto text-xs border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_contacted">Not Contacted</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="in_pipeline">In Pipeline</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground">
          First seen {formatDistanceToNow(new Date(sponsor.first_detected_at), { addSuffix: true })}
          {sponsor.last_detected_at !== sponsor.first_detected_at && (
            <> · Last seen {formatDistanceToNow(new Date(sponsor.last_detected_at), { addSuffix: true })}</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function BulkActionBar({
  selectedCount,
  selectedSponsors,
  onClearSelection,
  onSelectAll,
  totalCount,
}: {
  selectedCount: number;
  selectedSponsors: CompetitorSponsor[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  totalCount: number;
}) {
  const bulkUpdateStatus = useBulkUpdateSponsorStatus();
  const bulkCreateDeals = useBulkCreateDealsFromSponsors();
  const bulkDismiss = useBulkDismissSponsors();
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const eligibleForDeal = selectedSponsors.filter((s) => !s.deal_id).length;

  const handleBulkStatusUpdate = (status: string) => {
    const ids = selectedSponsors.map((s) => s.id);
    bulkUpdateStatus.mutate(
      { ids, outreach_status: status },
      {
        onSuccess: () => {
          toast.success(`Updated ${ids.length} sponsor${ids.length !== 1 ? "s" : ""} to "${STATUS_CONFIG[status]?.label || status}"`);
          onClearSelection();
        },
        onError: (err: any) => toast.error(err?.message || "Failed to update"),
      },
    );
  };

  const handleBulkCreateDeals = () => {
    const eligible = selectedSponsors.filter((s) => !s.deal_id);
    if (eligible.length === 0) {
      toast.info("All selected sponsors already have deals");
      return;
    }
    bulkCreateDeals.mutate(eligible, {
      onSuccess: (data) => {
        toast.success(`Created ${data.created} deal${data.created !== 1 ? "s" : ""} and added to CRM pipeline`);
        onClearSelection();
      },
      onError: (err: any) => toast.error(err?.message || "Failed to create deals"),
    });
  };

  const handleBulkDismiss = () => {
    const ids = selectedSponsors.map((s) => s.id);
    bulkDismiss.mutate(ids, {
      onSuccess: () => {
        toast.success(`Dismissed ${ids.length} sponsor${ids.length !== 1 ? "s" : ""}`);
        onClearSelection();
      },
      onError: (err: any) => toast.error(err?.message || "Failed to dismiss"),
    });
  };

  const isAnyPending = bulkUpdateStatus.isPending || bulkCreateDeals.isPending || bulkDismiss.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 backdrop-blur-lg shadow-2xl px-5 py-3">
        {/* Selection info */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {selectedCount} selected
          </span>
          {selectedCount < totalCount && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onSelectAll}>
              Select all {totalCount}
            </Button>
          )}
        </div>

        {/* Bulk status */}
        <Select
          value={bulkStatus}
          onValueChange={(v) => {
            setBulkStatus(v);
            handleBulkStatusUpdate(v);
          }}
          disabled={isAnyPending}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs bg-secondary border-border">
            <SelectValue placeholder="Set status…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_contacted">Not Contacted</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="in_pipeline">In Pipeline</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk create deals */}
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={handleBulkCreateDeals}
          disabled={isAnyPending || eligibleForDeal === 0}
        >
          <Handshake className="w-3.5 h-3.5" />
          {bulkCreateDeals.isPending
            ? "Creating…"
            : `Create ${eligibleForDeal} Deal${eligibleForDeal !== 1 ? "s" : ""}`}
        </Button>

        {/* Bulk dismiss */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive"
          onClick={handleBulkDismiss}
          disabled={isAnyPending}
        >
          <EyeOff className="w-3.5 h-3.5" />
          Dismiss
        </Button>

        {/* Clear */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          onClick={onClearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export function CompetitorSponsorScanner() {
  const { data: sponsors = [], isLoading } = useCompetitorSponsors();
  const scanMutation = useScanCompetitorSponsors();
  const updateStatus = useUpdateSponsorStatus();
  const dismissSponsor = useDismissSponsor();
  const createDeal = useCreateDealFromSponsor();
  const [filter, setFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleScan = () => {
    scanMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(
          `Scanned ${data.scanned} channels — found ${data.sponsors_found} sponsors (${data.total_mentions} total mentions)`,
        );
      },
      onError: (err: any) => toast.error(err?.message || "Scan failed"),
    });
  };

  const filtered = sponsors.filter((s) => {
    if (filter === "all") return true;
    if (filter === "hot") return (s.competitor_channels?.length || 0) >= 2 || s.mention_count >= 3;
    return s.outreach_status === filter;
  });

  const notContacted = sponsors.filter((s) => s.outreach_status === "not_contacted").length;
  const hotLeads = sponsors.filter(
    (s) => (s.competitor_channels?.length || 0) >= 2 || s.mention_count >= 3,
  ).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((s) => s.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedSponsors = useMemo(
    () => filtered.filter((s) => selectedIds.has(s.id)),
    [filtered, selectedIds],
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));
  const someFilteredSelected = filtered.some((s) => selectedIds.has(s.id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-mono text-foreground">{sponsors.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sponsors Found</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-mono text-amber-400">{hotLeads}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hot Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-mono text-blue-400">{notContacted}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Not Contacted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold font-mono text-green-400">
              {sponsors.filter((s) => s.outreach_status === "in_pipeline").length}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">In Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Select all checkbox */}
          <button
            onClick={() => {
              if (allFilteredSelected) clearSelection();
              else selectAll();
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : someFilteredSelected ? (
              <MinusSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select all
          </button>

          <Select value={filter} onValueChange={(v) => { setFilter(v); clearSelection(); }}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sponsors</SelectItem>
              <SelectItem value="hot">🔥 Hot Leads</SelectItem>
              <SelectItem value="not_contacted">Not Contacted</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="in_pipeline">In Pipeline</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} results</span>
        </div>
        <Button
          size="sm" onClick={handleScan}
          disabled={scanMutation.isPending}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? "animate-spin" : ""}`} />
          {scanMutation.isPending ? "Scanning…" : "Scan Competitors"}
        </Button>
      </div>

      {/* Sponsor cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {sponsors.length === 0
                ? 'No sponsors discovered yet. Click "Scan Competitors" to analyze competitor video descriptions.'
                : "No sponsors match the current filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sponsor) => (
            <SponsorCard
              key={sponsor.id}
              sponsor={sponsor}
              isSelected={selectedIds.has(sponsor.id)}
              onToggleSelect={toggleSelect}
              onStatusChange={(id, status) =>
                updateStatus.mutate({ id, outreach_status: status }, {
                  onSuccess: () => toast.success("Status updated"),
                })
              }
              onDismiss={(id) =>
                dismissSponsor.mutate(id, {
                  onSuccess: () => toast.success("Sponsor dismissed"),
                })
              }
              onCreateDeal={(s) =>
                createDeal.mutate(s, {
                  onSuccess: () => toast.success(`Deal created for ${s.sponsor_name} and added to CRM pipeline`),
                  onError: (err: any) => toast.error(err?.message || "Failed to create deal"),
                })
              }
              isCreatingDeal={createDeal.isPending}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            selectedSponsors={selectedSponsors}
            onClearSelection={clearSelection}
            onSelectAll={selectAll}
            totalCount={filtered.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

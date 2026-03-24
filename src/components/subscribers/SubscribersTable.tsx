import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Mail, ChevronRight, BookOpen, Video, Trash2, Download, Loader2, ArrowUpDown, Eye, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subscriber, SubscriberStatus } from "@/types/subscriber";
import { formatDistanceToNow } from "date-fns";
import { SubscriberEngagementBadge } from "./SubscriberEngagementBadge";
import { useBulkDeleteSubscribers } from "@/hooks/use-subscribers";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<SubscriberStatus, string> = {
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  unsubscribed: "bg-destructive/15 text-destructive border-destructive/30",
  bounced: "bg-warning/15 text-warning border-warning/30",
};

interface SubscribersTableProps {
  subscribers: Subscriber[];
  onSelectSubscriber: (subscriber: Subscriber) => void;
  selectedId?: string;
  addButton?: React.ReactNode;
}

export function SubscribersTable({ subscribers, onSelectSubscriber, selectedId, addButton }: SubscribersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"engagement" | "opens" | "ctr" | "recent">("recent");

  const bulkDelete = useBulkDeleteSubscribers();
  const { toast } = useToast();

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const filtered = useMemo(() => {
    const base = subscribers.filter((s) => {
      const matchesSearch =
        !search ||
        `${s.first_name ?? ""} ${s.last_name ?? ""} ${s.email} ${s.guide_requested ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSource = sourceFilter === "all" || s.source === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });

    return [...base].sort((a, b) => {
      const aEd = a.engagement_data;
      const bEd = b.engagement_data;
      switch (sortBy) {
        case "engagement":
          return b.engagement_score - a.engagement_score;
        case "opens": {
          const aRate = (aEd.emails_sent || 0) > 0 ? (aEd.emails_opened || 0) / aEd.emails_sent : 0;
          const bRate = (bEd.emails_sent || 0) > 0 ? (bEd.emails_opened || 0) / bEd.emails_sent : 0;
          return bRate - aRate;
        }
        case "ctr": {
          const aCtr = (aEd.emails_sent || 0) > 0 ? (aEd.emails_clicked || 0) / aEd.emails_sent : 0;
          const bCtr = (bEd.emails_sent || 0) > 0 ? (bEd.emails_clicked || 0) / bEd.emails_sent : 0;
          return bCtr - aCtr;
        }
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [subscribers, search, statusFilter, sourceFilter, sortBy]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds));
      toast({ title: `${selectedIds.size} subscriber(s) removed` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCsv = () => {
    const selected = filtered.filter((s) => selectedIds.has(s.id));
    const rows = selected.length > 0 ? selected : filtered;
    const headers = ["Email", "First Name", "Last Name", "Status", "Source", "Guide", "Engagement Score", "Subscribed"];
    const csvContent = [
      headers.join(","),
      ...rows.map((s) =>
        [
          `"${s.email}"`,
          `"${s.first_name ?? ""}"`,
          `"${s.last_name ?? ""}"`,
          s.status,
          s.source ?? "",
          s.guide_requested ?? "",
          s.engagement_score,
          s.created_at.split("T")[0],
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${rows.length} subscriber(s)` });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] bg-card border-border shrink-0">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[120px] bg-card border-border shrink-0">
            <Video className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="import">Import</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto shrink-0">
          {addButton}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
            {bulkDelete.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}
        {search || statusFilter !== "all" || sourceFilter !== "all" ? " (filtered)" : ""}
      </p>

      {/* Mobile card list */}
      <div className="md:hidden rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No subscribers found
          </div>
        ) : (
          filtered.map((sub) => (
            <button
              key={sub.id}
              onClick={() => onSelectSubscriber(sub)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                selectedId === sub.id
                  ? "bg-primary/5"
                  : "hover:bg-accent/50 active:bg-accent/70"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {(sub.first_name ?? sub.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {sub.first_name ? `${sub.first_name} ${sub.last_name ?? ""}` : sub.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs uppercase tracking-wider shrink-0", statusColors[sub.status])}>
                    {sub.status}
                  </Badge>
                  {sub.guide_requested && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {sub.guide_requested}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">Subscriber</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Email</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Source</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Guide</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Referrer</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Opens</TableHead>
              <TableHead className="text-muted-foreground font-semibold">CTR</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Engagement</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Subscribed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                  No subscribers found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sub) => (
                <TableRow
                  key={sub.id}
                  onClick={() => onSelectSubscriber(sub)}
                  className={cn(
                    "cursor-pointer border-border transition-colors",
                    selectedIds.has(sub.id) && "bg-primary/5",
                    selectedId === sub.id
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-accent/50"
                  )}
                >
                  <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(sub.id)}
                      onCheckedChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(sub.id)) next.delete(sub.id);
                          else next.add(sub.id);
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {(sub.first_name ?? sub.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sub.first_name ? `${sub.first_name} ${sub.last_name ?? ""}`.trim() : "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground truncate">{sub.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", statusColors[sub.status])}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground capitalize">{sub.source ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    {sub.guide_requested ? (
                      <span className="text-sm text-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        {sub.guide_requested}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sub.referrer ? (
                      <span className="text-sm text-foreground truncate max-w-[180px] block" title={sub.referrer}>
                        {(() => {
                          try { return new URL(sub.referrer).hostname; } catch { return sub.referrer; }
                        })()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const ed = sub.engagement_data;
                      const sent = ed.emails_sent || 0;
                      const opened = ed.emails_opened || 0;
                      const rate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                      return (
                        <span className="text-xs font-mono text-foreground">
                          {sent > 0 ? `${rate}%` : "—"}
                          {sent > 0 && <span className="text-muted-foreground ml-1">({opened}/{sent})</span>}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const ed = sub.engagement_data;
                      const sent = ed.emails_sent || 0;
                      const clicked = ed.emails_clicked || 0;
                      const rate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
                      return (
                        <span className="text-xs font-mono text-foreground">
                          {sent > 0 ? `${rate}%` : "—"}
                          {sent > 0 && <span className="text-muted-foreground ml-1">({clicked})</span>}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <SubscriberEngagementBadge score={sub.engagement_score} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
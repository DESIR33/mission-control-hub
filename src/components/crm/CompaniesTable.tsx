import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Filter, Building2, MapPin, Users, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Video, Trash2, Pencil, Sparkles, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company, VipTier } from "@/types/crm";
import { formatDistanceToNow } from "date-fns";
import { useCompanyRevenue } from "@/hooks/use-company-revenue";
import { useAllVideoCompanies } from "@/hooks/use-all-video-companies";
import { useDeleteCompany } from "@/hooks/use-companies";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BulkActionsBar } from "./BulkActionsBar";

const tierIcons: Record<VipTier, string> = {
  none: "",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

const tierOrder: Record<VipTier, number> = { none: 0, silver: 1, gold: 2, platinum: 3 };

type SortKey = "name" | "industry" | "location" | "videos" | "vip" | "revenue" | "contacts" | "lastContact";
type SortDir = "asc" | "desc";

function formatCurrency(value: number): string {
  if (value === 0) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

interface CompaniesTableProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  selectedId?: string;
  addButton?: React.ReactNode;
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground/50" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
}

export function CompaniesTable({ companies, onSelectCompany, selectedId, addButton }: CompaniesTableProps) {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const revenueMap = useCompanyRevenue();
  const { data: allVideoLinks = [] } = useAllVideoCompanies();
  const deleteCompany = useDeleteCompany();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();

  const videoCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of allVideoLinks) {
      map.set(link.company_id, (map.get(link.company_id) ?? 0) + 1);
    }
    return map;
  }, [allVideoLinks]);

  const industries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = companies.filter((c) => {
      const matchesSearch =
        !search ||
        `${c.name} ${c.industry ?? ""} ${c.location ?? ""} ${c.primary_email ?? ""} ${c.country ?? ""} ${c.state ?? ""} ${c.city ?? ""} ${c.phone ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesIndustry = industryFilter === "all" || c.industry === industryFilter;
      const matchesSize = sizeFilter === "all" || c.size === sizeFilter;
      return matchesSearch && matchesIndustry && matchesSize;
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "name": cmp = a.name.localeCompare(b.name); break;
          case "industry": cmp = (a.industry ?? "").localeCompare(b.industry ?? ""); break;
          case "location": cmp = (a.location ?? "").localeCompare(b.location ?? ""); break;
          case "videos": cmp = (videoCountMap.get(a.id) ?? 0) - (videoCountMap.get(b.id) ?? 0); break;
          case "vip": cmp = tierOrder[a.vip_tier] - tierOrder[b.vip_tier]; break;
          case "revenue": cmp = (revenueMap[a.id]?.total ?? 0) - (revenueMap[b.id]?.total ?? 0); break;
          case "contacts": cmp = (a.contacts?.length ?? 0) - (b.contacts?.length ?? 0); break;
          case "lastContact": {
            const da = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
            const db = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
            cmp = da - db;
            break;
          }
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [companies, search, industryFilter, sizeFilter, sortKey, sortDir, revenueMap, videoCountMap]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCompany.mutateAsync(deleteTarget.id);
      toast({ title: `Deleted "${deleteTarget.name}"` });
    } catch {
      toast({ title: "Failed to delete company", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleEnrich = async (company: Company) => {
    if (!workspaceId) return;
    try {
      await supabase.functions.invoke("enrich-company", {
        body: { workspace_id: workspaceId, company_id: company.id },
      });
      toast({ title: `Enriching "${company.name}"…` });
    } catch {
      toast({ title: "Enrichment failed", variant: "destructive" });
    }
  };

  const thClass = "text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors";

  const renderContextMenu = (company: Company, children: React.ReactNode) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onSelectCompany(company)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          View Details
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleEnrich(company)}>
          <Sparkles className="w-4 h-4 mr-2" />
          Enrich
        </ContextMenuItem>
        {company.website && (
          <ContextMenuItem onClick={() => window.open(company.website!, "_blank")}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Website
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteTarget(company)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[130px] bg-card border-border shrink-0">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sizeFilter} onValueChange={setSizeFilter}>
          <SelectTrigger className="w-[120px] bg-card border-border shrink-0">
            <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="1-10">1-10</SelectItem>
            <SelectItem value="11-50">11-50</SelectItem>
            <SelectItem value="51-200">51-200</SelectItem>
            <SelectItem value="201-500">201-500</SelectItem>
            <SelectItem value="501-1000">501-1000</SelectItem>
            <SelectItem value="1000+">1000+</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto shrink-0">
          {addButton}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} compan{filtered.length !== 1 ? "ies" : "y"}
        {search || industryFilter !== "all" || sizeFilter !== "all" ? " (filtered)" : ""}
      </p>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        entityType="company"
      />

      {/* Mobile card list */}
      <div className="md:hidden rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No companies found
          </div>
        ) : (
          filtered.map((company) => {
            const rev = revenueMap[company.id];
            return renderContextMenu(
              company,
              <button
                key={company.id}
                onClick={() => onSelectCompany(company)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  selectedId === company.id ? "bg-primary/5" : "hover:bg-accent/50 active:bg-accent/70"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                    {company.vip_tier !== "none" && (
                      <span className="text-sm leading-none shrink-0">{tierIcons[company.vip_tier]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {company.industry && <span className="text-xs text-muted-foreground">{company.industry}</span>}
                    {company.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />{company.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {rev && rev.total > 0 && (
                      <span className="text-xs font-medium text-emerald-500">{formatCurrency(rev.total)}</span>
                    )}
                    <Badge variant="outline" className="text-xs shrink-0">
                      {company.contacts?.length ?? 0} contacts
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })
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
              <TableHead className={thClass} onClick={() => handleSort("name")}>
                <div className="flex items-center">Company<SortIcon column="name" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("industry")}>
                <div className="flex items-center">Industry<SortIcon column="industry" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("location")}>
                <div className="flex items-center">Location<SortIcon column="location" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("videos")}>
                <div className="flex items-center">Videos<SortIcon column="videos" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("vip")}>
                <div className="flex items-center">VIP<SortIcon column="vip" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("revenue")}>
                <div className="flex items-center">Revenue<SortIcon column="revenue" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("contacts")}>
                <div className="flex items-center">Contacts<SortIcon column="contacts" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
              <TableHead className={thClass} onClick={() => handleSort("lastContact")}>
                <div className="flex items-center">Last Contact<SortIcon column="lastContact" sortKey={sortKey} sortDir={sortDir} /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((company) => {
                const rev = revenueMap[company.id];
                return renderContextMenu(
                  company,
                  <TableRow
                    key={company.id}
                    onClick={() => onSelectCompany(company)}
                    className={cn(
                      "cursor-pointer border-border transition-colors",
                      selectedIds.has(company.id) && "bg-primary/5",
                      selectedId === company.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(company.id)}
                        onCheckedChange={() => toggleSelect(company.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {company.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                          {company.website && (
                            <p className="text-xs text-muted-foreground truncate">{company.website}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{company.industry ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {company.location && <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />}
                        <span className="text-sm text-muted-foreground truncate">{company.location ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{videoCountMap.get(company.id) ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.vip_tier !== "none" && (
                        <span className="text-sm" title={company.vip_tier}>
                          {tierIcons[company.vip_tier]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm font-medium", rev && rev.total > 0 ? "text-emerald-500" : "text-muted-foreground")}>
                        {formatCurrency(rev?.total ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {company.contacts?.length ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {company.last_contact_date
                          ? formatDistanceToNow(new Date(company.last_contact_date), { addSuffix: true })
                          : "Never"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the company. This action can be reversed by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

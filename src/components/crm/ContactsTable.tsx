import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Mail, Phone, Star, ChevronRight, Calendar, Target, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, ContactStatus, VipTier } from "@/types/crm";
import { formatDistanceToNow, isPast, isToday, differenceInDays, addDays } from "date-fns";
import { BulkActionsBar } from "./BulkActionsBar";
import { EngagementBadge } from "./EngagementBadge";
import { WarmthBadge, LeadScoreIndicator } from "./WarmthBadge";

const statusColors: Record<ContactStatus, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const tierConfig: Record<VipTier, { icon: string; label: string; className: string }> = {
  none: { icon: "", label: "", className: "" },
  silver: { icon: "🥈", label: "Silver", className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  gold: { icon: "🥇", label: "Gold", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  platinum: { icon: "💎", label: "Platinum", className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
};

type ViewMode = "all" | "follow_up" | "sponsor_pipeline";

interface ContactsTableProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  selectedId?: string;
  addButton?: React.ReactNode;
}

function getFollowUpUrgency(date: string | null | undefined): { label: string; className: string } | null {
  if (!date) return null;
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) return { label: "Overdue", className: "text-red-600 dark:text-red-400" };
  if (isToday(d)) return { label: "Today", className: "text-orange-600 dark:text-orange-400" };
  if (differenceInDays(d, new Date()) <= 7) return { label: "This week", className: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Later", className: "text-muted-foreground" };
}

export function ContactsTable({ contacts, onSelectContact, selectedId, addButton }: ContactsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [warmthFilter, setWarmthFilter] = useState<string>("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === display.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(display.map(c => c.id)));
  };

  const filtered = useMemo(() => {
    let result = contacts.filter((c) => {
      const matchesSearch =
        !search ||
        `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""} ${c.company?.name ?? ""} ${c.job_title ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesTier = tierFilter === "all" || c.vip_tier === tierFilter;
      const matchesWarmth = warmthFilter === "all" || c.warmth === warmthFilter;
      const matchesType = contactTypeFilter === "all" || c.contact_type === contactTypeFilter;
      return matchesSearch && matchesStatus && matchesTier && matchesWarmth && matchesType;
    });
    return result;
  }, [contacts, search, statusFilter, tierFilter, warmthFilter, contactTypeFilter]);

  const display = useMemo(() => {
    let result = [...filtered];

    // Apply view-specific filtering
    if (viewMode === "follow_up") {
      result = result.filter(c => c.next_follow_up_date);
    } else if (viewMode === "sponsor_pipeline") {
      result = result.filter(c => c.contact_type === "sponsor_lead");
    }

    // Apply sorting
    if (viewMode === "follow_up" && !sortField) {
      result.sort((a, b) => new Date(a.next_follow_up_date!).getTime() - new Date(b.next_follow_up_date!).getTime());
    } else if (viewMode === "sponsor_pipeline" && !sortField) {
      result.sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0));
    } else if (sortField) {
      result.sort((a, b) => {
        let va: any, vb: any;
        switch (sortField) {
          case "lead_score": va = a.lead_score ?? 0; vb = b.lead_score ?? 0; break;
          case "outreach_count": va = a.outreach_count ?? 0; vb = b.outreach_count ?? 0; break;
          case "next_follow_up_date": va = a.next_follow_up_date ?? ""; vb = b.next_follow_up_date ?? ""; break;
          case "last_response_date": va = a.last_response_date ?? ""; vb = b.last_response_date ?? ""; break;
          default: return 0;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filtered, viewMode, sortField, sortDir]);

  const SortableHead = ({ field, children, className }: { field: string; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={cn("text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSortField(null); }}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="text-xs gap-1.5">All Contacts</TabsTrigger>
          <TabsTrigger value="follow_up" className="text-xs gap-1.5">
            <Calendar className="w-3.5 h-3.5" />Follow-up Queue
          </TabsTrigger>
          <TabsTrigger value="sponsor_pipeline" className="text-xs gap-1.5">
            <Target className="w-3.5 h-3.5" />Sponsor Pipeline
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] bg-card border-border shrink-0">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={warmthFilter} onValueChange={setWarmthFilter}>
          <SelectTrigger className="w-[120px] bg-card border-border shrink-0">
            <Flame className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Warmth" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warmth</SelectItem>
            <SelectItem value="hot">🔥 Hot</SelectItem>
            <SelectItem value="warm">🟠 Warm</SelectItem>
            <SelectItem value="warming">🟡 Warming</SelectItem>
            <SelectItem value="cold">🔵 Cold</SelectItem>
            <SelectItem value="active">🟢 Active</SelectItem>
          </SelectContent>
        </Select>

        <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
          <SelectTrigger className="w-[130px] bg-card border-border shrink-0">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sponsor_lead">Sponsor Lead</SelectItem>
            <SelectItem value="collaborator">Collaborator</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="subscriber">Subscriber</SelectItem>
            <SelectItem value="agency_rep">Agency Rep</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {viewMode === "all" && (
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[120px] bg-card border-border shrink-0">
              <Star className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="VIP Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="platinum">💎 Platinum</SelectItem>
              <SelectItem value="gold">🥇 Gold</SelectItem>
              <SelectItem value="silver">🥈 Silver</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto shrink-0">
          {addButton}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {display.length} contact{display.length !== 1 ? "s" : ""}
        {search || statusFilter !== "all" || tierFilter !== "all" || warmthFilter !== "all" || contactTypeFilter !== "all" ? " (filtered)" : ""}
      </p>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        entityType="contact"
      />

      {/* Mobile card list */}
      <div className="md:hidden rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {display.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No contacts found</div>
        ) : (
          display.map((contact) => {
            const urgency = getFollowUpUrgency(contact.next_follow_up_date);
            return (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  selectedId === contact.id ? "bg-primary/5" : "hover:bg-accent/50 active:bg-accent/70"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{contact.first_name} {contact.last_name}</p>
                    <WarmthBadge warmth={contact.warmth} />
                    {contact.is_decision_maker && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">DM</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {contact.company?.name && <span className="text-xs text-muted-foreground">{contact.company.name}</span>}
                    <Badge variant="outline" className={cn("text-xs uppercase tracking-wider shrink-0", statusColors[contact.status])}>{contact.status}</Badge>
                  </div>
                  {viewMode === "follow_up" && urgency && (
                    <p className={cn("text-xs mt-0.5 font-medium", urgency.className)}>
                      Follow-up: {urgency.label}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {contact.lead_score != null && <LeadScoreIndicator score={contact.lead_score} />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
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
                  checked={display.length > 0 && selectedIds.size === display.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Company</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Warmth</TableHead>
              <SortableHead field="lead_score">Score</SortableHead>

              {viewMode === "follow_up" ? (
                <>
                  <SortableHead field="next_follow_up_date">Follow-up</SortableHead>
                  <SortableHead field="last_response_date">Last Response</SortableHead>
                  <SortableHead field="outreach_count">Outreach #</SortableHead>
                </>
              ) : viewMode === "sponsor_pipeline" ? (
                <>
                  <TableHead className="text-muted-foreground font-semibold">Budget</TableHead>
                  <SortableHead field="last_response_date">Last Response</SortableHead>
                  <TableHead className="text-muted-foreground font-semibold">Deal Type</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-muted-foreground font-semibold">Type</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Last Contact</TableHead>
                  <TableHead className="text-muted-foreground font-semibold w-[80px]">Channels</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {display.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No contacts found</TableCell>
              </TableRow>
            ) : (
              display.map((contact) => {
                const urgency = getFollowUpUrgency(contact.next_follow_up_date);
                return (
                  <TableRow
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className={cn(
                      "cursor-pointer border-border transition-colors",
                      selectedIds.has(contact.id) && "bg-primary/5",
                      selectedId === contact.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/50"
                    )}
                  >
                    <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(contact.id)) next.delete(contact.id);
                            else next.add(contact.id);
                            return next;
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground truncate">{contact.first_name} {contact.last_name}</p>
                            {contact.is_decision_maker && <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">DM</Badge>}
                          </div>
                          {(contact.job_title || contact.role) && (
                            <p className="text-xs text-muted-foreground truncate">{contact.job_title || contact.role}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{contact.company?.name ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs uppercase tracking-wider", statusColors[contact.status])}>{contact.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <WarmthBadge warmth={contact.warmth} />
                    </TableCell>
                    <TableCell>
                      <LeadScoreIndicator score={contact.lead_score} />
                    </TableCell>

                    {viewMode === "follow_up" ? (
                      <>
                        <TableCell>
                          {contact.next_follow_up_date ? (
                            <span className={cn("text-xs font-medium", urgency?.className)}>
                              {urgency?.label} · {new Date(contact.next_follow_up_date).toLocaleDateString()}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {contact.last_response_date
                              ? formatDistanceToNow(new Date(contact.last_response_date), { addSuffix: true })
                              : "Never"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm tabular-nums text-muted-foreground">{contact.outreach_count ?? 0}</span>
                        </TableCell>
                      </>
                    ) : viewMode === "sponsor_pipeline" ? (
                      <>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{contact.typical_budget_range ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {contact.last_response_date
                              ? formatDistanceToNow(new Date(contact.last_response_date), { addSuffix: true })
                              : "Never"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">{contact.preferred_deal_type?.replace("_", " ") ?? "—"}</span>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">{contact.contact_type?.replace("_", " ") ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {contact.last_contact_date
                              ? formatDistanceToNow(new Date(contact.last_contact_date), { addSuffix: true })
                              : "Never"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {contact.email && <Mail className="w-3.5 h-3.5 text-muted-foreground" />}
                            {contact.phone && <Phone className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

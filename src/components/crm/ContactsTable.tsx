import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Mail, Phone, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, ContactStatus, VipTier } from "@/types/crm";
import { formatDistanceToNow } from "date-fns";
import { BulkActionsBar } from "./BulkActionsBar";

const statusColors: Record<ContactStatus, string> = {
  active: "bg-success/15 text-success border-success/30",
  lead: "bg-primary/15 text-primary border-primary/30",
  customer: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const tierIcons: Record<VipTier, string> = {
  none: "",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

interface ContactsTableProps {
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  selectedId?: string;
  addButton?: React.ReactNode;
}

export function ContactsTable({ contacts, onSelectContact, selectedId, addButton }: ContactsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""} ${c.company?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesTier = tierFilter === "all" || c.vip_tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  return (
    <div className="flex flex-col gap-4">
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

        <div className="ml-auto shrink-0">
          {addButton}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        {search || statusFilter !== "all" || tierFilter !== "all" ? " (filtered)" : ""}
      </p>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        entityType="contact"
      />

      {/* Mobile card list — visible only on small screens */}
      <div className="md:hidden rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No contacts found
          </div>
        ) : (
          filtered.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                selectedId === contact.id
                  ? "bg-primary/5"
                  : "hover:bg-accent/50 active:bg-accent/70"
              )}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {contact.first_name[0]}
                  {contact.last_name?.[0] ?? ""}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-foreground">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.vip_tier !== "none" && (
                    <span className="text-sm leading-none">{tierIcons[contact.vip_tier]}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {contact.company?.name && (
                    <span className="text-xs text-muted-foreground">
                      {contact.company.name}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase tracking-wider shrink-0", statusColors[contact.status])}
                  >
                    {contact.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {contact.email && <Mail className="w-3 h-3 text-muted-foreground shrink-0" />}
                  {contact.phone && <Phone className="w-3 h-3 text-muted-foreground shrink-0" />}
                  {contact.last_contact_date && (
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(contact.last_contact_date), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Desktop table — hidden on small screens */}
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
              <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Company</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">VIP</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Source</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Last Contact</TableHead>
              <TableHead className="text-muted-foreground font-semibold w-[80px]">Channels</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((contact) => (
                <TableRow
                  key={contact.id}
                  onClick={() => onSelectContact(contact)}
                  className={cn(
                    "cursor-pointer border-border transition-colors",
                    selectedIds.has(contact.id) && "bg-primary/5",
                    selectedId === contact.id
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-accent/50"
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
                          {contact.first_name[0]}
                          {contact.last_name?.[0] ?? ""}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.role && (
                          <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{contact.company?.name ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] uppercase tracking-wider", statusColors[contact.status])}
                    >
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.vip_tier !== "none" && (
                      <span className="text-sm" title={contact.vip_tier}>
                        {tierIcons[contact.vip_tier]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{contact.source ?? "—"}</span>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

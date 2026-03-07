import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Building2, Globe, MapPin, Users, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company, VipTier } from "@/types/crm";
import { formatDistanceToNow } from "date-fns";

const tierIcons: Record<VipTier, string> = {
  none: "",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

interface CompaniesTableProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  selectedId?: string;
  addButton?: React.ReactNode;
}

export function CompaniesTable({ companies, onSelectCompany, selectedId, addButton }: CompaniesTableProps) {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");

  const industries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[];

  const filtered = companies.filter((c) => {
    const matchesSearch =
      !search ||
      `${c.name} ${c.industry ?? ""} ${c.location ?? ""} ${c.primary_email ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesIndustry = industryFilter === "all" || c.industry === industryFilter;
    const matchesSize = sizeFilter === "all" || c.size === sizeFilter;
    return matchesSearch && matchesIndustry && matchesSize;
  });

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

      {/* Mobile card list — visible only on small screens */}
      <div className="md:hidden rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No companies found
          </div>
        ) : (
          filtered.map((company) => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                selectedId === company.id
                  ? "bg-primary/5"
                  : "hover:bg-accent/50 active:bg-accent/70"
              )}
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-4 h-4 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground truncate">
                    {company.name}
                  </p>
                  {company.vip_tier !== "none" && (
                    <span className="text-sm leading-none shrink-0">{tierIcons[company.vip_tier]}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {company.industry && (
                    <span className="text-xs text-muted-foreground">{company.industry}</span>
                  )}
                  {company.location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {company.location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {company.size && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Users className="w-3 h-3 shrink-0" />
                      {company.size}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs shrink-0">
                    {company.contacts?.length ?? 0} contacts
                  </Badge>
                  {company.last_contact_date && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(company.last_contact_date), { addSuffix: true })}
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
              <TableHead className="text-muted-foreground font-semibold">Company</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Industry</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Location</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Size</TableHead>
              <TableHead className="text-muted-foreground font-semibold">VIP</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Contacts</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Last Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((company) => (
                <TableRow
                  key={company.id}
                  onClick={() => onSelectCompany(company)}
                  className={cn(
                    "cursor-pointer border-border transition-colors",
                    selectedId === company.id
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-accent/50"
                  )}
                >
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
                    <span className="text-sm text-muted-foreground">{company.size ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    {company.vip_tier !== "none" && (
                      <span className="text-sm" title={company.vip_tier}>
                        {tierIcons[company.vip_tier]}
                      </span>
                    )}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

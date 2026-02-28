import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X, Save, RotateCcw } from "lucide-react";
import type { Contact, Company } from "@/types/crm";

export interface ContactFilterCriteria {
  search: string;
  status: string;
  vipTier: string;
  companyId: string;
  source: string;
  hasEmail: string;
  hasPhone: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_CONTACT_FILTERS: ContactFilterCriteria = {
  search: "",
  status: "all",
  vipTier: "all",
  companyId: "all",
  source: "",
  hasEmail: "all",
  hasPhone: "all",
  dateFrom: "",
  dateTo: "",
};

interface SavedFilter {
  name: string;
  criteria: ContactFilterCriteria;
}

interface AdvancedContactFiltersProps {
  filters: ContactFilterCriteria;
  onFiltersChange: (filters: ContactFilterCriteria) => void;
  companies: Company[];
  contacts: Contact[];
}

export function AdvancedContactFilters({
  filters,
  onFiltersChange,
  companies,
  contacts,
}: AdvancedContactFiltersProps) {
  const [open, setOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("crm_saved_contact_filters") || "[]");
    } catch {
      return [];
    }
  });
  const [filterName, setFilterName] = useState("");

  const sources = Array.from(new Set(contacts.map((c) => c.source).filter(Boolean))) as string[];

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "search") return false;
    const defaultVal = DEFAULT_CONTACT_FILTERS[key as keyof ContactFilterCriteria];
    return value !== defaultVal;
  }).length;

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    const updated = [...savedFilters, { name: filterName.trim(), criteria: { ...filters } }];
    setSavedFilters(updated);
    localStorage.setItem("crm_saved_contact_filters", JSON.stringify(updated));
    setFilterName("");
  };

  const handleLoadFilter = (saved: SavedFilter) => {
    onFiltersChange(saved.criteria);
    setOpen(false);
  };

  const handleDeleteSavedFilter = (index: number) => {
    const updated = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(updated);
    localStorage.setItem("crm_saved_contact_filters", JSON.stringify(updated));
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_CONTACT_FILTERS);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 relative bg-card border-border">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-4 z-[1001]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Advanced Filters</h4>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VIP Tier</Label>
              <Select value={filters.vipTier} onValueChange={(v) => onFiltersChange({ ...filters, vipTier: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Select value={filters.companyId} onValueChange={(v) => onFiltersChange({ ...filters, companyId: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="none">No Company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={filters.source || "all"} onValueChange={(v) => onFiltersChange({ ...filters, source: v === "all" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Has Email</Label>
              <Select value={filters.hasEmail} onValueChange={(v) => onFiltersChange({ ...filters, hasEmail: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Has Phone</Label>
              <Select value={filters.hasPhone} onValueChange={(v) => onFiltersChange({ ...filters, hasPhone: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Created From</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Created To</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          {/* Save/Load Filters */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter name..."
                className="h-8 text-xs flex-1"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleSaveFilter} disabled={!filterName.trim()}>
                <Save className="w-3 h-3" />
                Save
              </Button>
            </div>
            {savedFilters.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved Filters</Label>
                <div className="flex flex-wrap gap-1">
                  {savedFilters.map((sf, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer text-xs gap-1 pr-1"
                      onClick={() => handleLoadFilter(sf)}
                    >
                      {sf.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSavedFilter(i); }}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function applyContactFilters(contacts: Contact[], filters: ContactFilterCriteria): Contact[] {
  return contacts.filter((c) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchStr = `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""} ${c.company?.name ?? ""} ${c.phone ?? ""} ${c.role ?? ""} ${c.source ?? ""}`.toLowerCase();
      if (!searchStr.includes(q)) return false;
    }
    if (filters.status !== "all" && c.status !== filters.status) return false;
    if (filters.vipTier !== "all" && c.vip_tier !== filters.vipTier) return false;
    if (filters.companyId === "none" && c.company_id) return false;
    if (filters.companyId !== "all" && filters.companyId !== "none" && c.company_id !== filters.companyId) return false;
    if (filters.source && c.source !== filters.source) return false;
    if (filters.hasEmail === "yes" && !c.email) return false;
    if (filters.hasEmail === "no" && c.email) return false;
    if (filters.hasPhone === "yes" && !c.phone) return false;
    if (filters.hasPhone === "no" && c.phone) return false;
    if (filters.dateFrom && new Date(c.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(c.created_at) > new Date(filters.dateTo + "T23:59:59")) return false;
    return true;
  });
}

export { DEFAULT_CONTACT_FILTERS };

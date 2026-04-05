import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Building2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useExpenses, type ExpenseCategory } from "@/hooks/use-expenses";

interface Props {
  categories: ExpenseCategory[];
}

const fmtMoney = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface VendorGroup {
  vendor: string;
  total: number;
  count: number;
  avgAmount: number;
  categories: string[];
  firstDate: string;
  lastDate: string;
}

export function VendorSummary({ categories }: Props) {
  const { data: expenses = [], isLoading } = useExpenses();
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return expenses;
    const yr = Number(yearFilter);
    return expenses.filter(
      (e) => new Date(e.expense_date || e.created_at).getFullYear() === yr
    );
  }, [expenses, yearFilter]);

  const vendors = useMemo((): VendorGroup[] => {
    const map = new Map<
      string,
      { total: number; count: number; cats: Set<string>; first: string; last: string }
    >();

    filtered.forEach((e) => {
      const key = (e.vendor || "Unknown Vendor").trim();
      const entry = map.get(key) || {
        total: 0,
        count: 0,
        cats: new Set<string>(),
        first: e.expense_date,
        last: e.expense_date,
      };
      entry.total += Number(e.amount);
      entry.count += 1;
      if (e.category_id) entry.cats.add(e.category_id);
      if (e.expense_date < entry.first) entry.first = e.expense_date;
      if (e.expense_date > entry.last) entry.last = e.expense_date;
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .map(([vendor, d]) => ({
        vendor,
        total: d.total,
        count: d.count,
        avgAmount: d.total / d.count,
        categories: Array.from(d.cats),
        firstDate: d.first,
        lastDate: d.last,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const grandTotal = vendors.reduce((s, v) => s + v.total, 0);

  const vendorExpenses = useMemo(() => {
    if (!expanded) return [];
    return filtered
      .filter((e) => (e.vendor || "Unknown Vendor").trim() === expanded)
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [filtered, expanded]);

  if (isLoading) return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-64" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} · {fmtMoney(grandTotal)} total
          </span>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No expenses found for this period.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {vendors.map((v) => {
            const pct = grandTotal > 0 ? (v.total / grandTotal) * 100 : 0;
            const isOpen = expanded === v.vendor;

            return (
              <div key={v.vendor} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Vendor row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : v.vendor)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{v.vendor}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {v.count} expense{v.count !== 1 ? "s" : ""}
                      </Badge>
                      {v.categories.map((cid) => {
                        const cat = catMap.get(cid);
                        return cat ? (
                          <span
                            key={cid}
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                            title={cat.name}
                          />
                        ) : null;
                      })}
                    </div>
                    {/* Bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="font-mono font-semibold text-sm">{fmtMoney(v.total)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      avg {fmtMoney(v.avgAmount)}
                    </p>
                  </div>
                </button>

                {/* Expanded expense list */}
                {isOpen && (
                  <div className="border-t border-border bg-muted/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Category</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorExpenses.map((e) => {
                          const cat = e.category_id ? catMap.get(e.category_id) : null;
                          return (
                            <tr
                              key={e.id}
                              className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                              onClick={() => navigate(`/finance/expenses/edit/${e.id}`)}
                            >
                              <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                {format(new Date(e.expense_date), "MMM d, yyyy")}
                              </td>
                              <td className="px-4 py-2 truncate max-w-[200px]">{e.title}</td>
                              <td className="px-4 py-2">
                                {cat ? (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="text-xs text-muted-foreground">{cat.name}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right font-mono">
                                {fmtMoney(Number(e.amount))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

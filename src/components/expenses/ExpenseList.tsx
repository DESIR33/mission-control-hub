import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Trash2, Receipt, Search, Filter, Tag, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses, useDeleteExpense, type ExpenseCategory } from "@/hooks/use-expenses";

interface Props {
  categories: ExpenseCategory[];
}

export function ExpenseList({ categories }: Props) {
  const navigate = useNavigate();
  const { data: expenses = [], isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    let result = expenses;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.vendor ?? "").toLowerCase().includes(q)
      );
    }
    if (catFilter !== "all") {
      result = result.filter((e) => e.category_id === catFilter);
    }
    return result;
  }, [expenses, search, catFilter]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate("/finance/expenses/new")} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No expenses found. Add your first expense to start tracking.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((expense) => {
                const cat = expense.category_id ? catMap.get(expense.category_id) : null;
                return (
                  <TableRow
                    key={expense.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/finance/expenses/${expense.id}/edit`)}
                  >
                    <TableCell className="text-sm tabular-nums">
                      {format(new Date(expense.expense_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{expense.title}</span>
                        {expense.receipt_url && <Receipt className="h-3.5 w-3.5 text-muted-foreground" />}
                        {expense.is_tax_deductible && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <Badge variant="outline" className="text-xs" style={{ borderColor: cat.color, color: cat.color }}>
                          <Tag className="h-2.5 w-2.5 mr-1" /> {cat.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{expense.vendor || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      ${Number(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); navigate(`/finance/expenses/${expense.id}/edit`); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteExpense.mutate(expense.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{filtered.length} expense{filtered.length !== 1 ? "s" : ""}</span>
            <span className="font-mono font-semibold text-sm">Total: ${totalFiltered.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

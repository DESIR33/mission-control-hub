import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Trash2, Receipt, Search, Filter, Tag, CheckCircle2, Pencil, Download, Eye, Loader2, FileArchive, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses, useDeleteExpense, useCreateExpense, type ExpenseCategory } from "@/hooks/use-expenses";
import { ReceiptViewerDialog } from "./ReceiptViewerDialog";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

interface Props {
  categories: ExpenseCategory[];
}

export function ExpenseList({ categories }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: expenses = [], isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const createExpense = useCreateExpense();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [viewReceipt, setViewReceipt] = useState<{ url: string; title: string } | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

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
  const expensesWithReceipts = filtered.filter((e) => e.receipt_url);

  const handleDownloadSingle = async (url: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = url.split(".").pop()?.split("?")[0] || "file";
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_receipt.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleBulkDownload = async () => {
    if (expensesWithReceipts.length === 0) return;
    setBulkDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("receipts")!;

      await Promise.all(
        expensesWithReceipts.map(async (expense, i) => {
          try {
            const res = await fetch(expense.receipt_url!);
            const blob = await res.blob();
            const ext = expense.receipt_url!.split(".").pop()?.split("?")[0] || "file";
            const safeName = expense.title.replace(/[^a-zA-Z0-9]/g, "_");
            const dateStr = format(new Date(expense.expense_date), "yyyy-MM-dd");
            folder.file(`${dateStr}_${safeName}_${i + 1}.${ext}`, blob);
          } catch {
            // skip failed downloads
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipts_${format(new Date(), "yyyy-MM-dd")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Receipts downloaded", description: `${expensesWithReceipts.length} receipt(s) packaged into ZIP.` });
    } catch {
      toast({ title: "Download failed", description: "Could not create ZIP archive.", variant: "destructive" });
    } finally {
      setBulkDownloading(false);
    }
  };

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
        <div className="flex gap-2">
          {expensesWithReceipts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="gap-1.5"
            >
              {bulkDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileArchive className="h-4 w-4" />
              )}
              {bulkDownloading ? "Zipping..." : `Download All Receipts (${expensesWithReceipts.length})`}
            </Button>
          )}
          <Button onClick={() => navigate("/finance/expenses/new")} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
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
              <TableHead className="w-[120px]"></TableHead>
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
                        {expense.receipt_url && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="View receipt"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewReceipt({ url: expense.receipt_url!, title: expense.title });
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Download receipt"
                              onClick={(e) => handleDownloadSingle(expense.receipt_url!, expense.title, e)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
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
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Duplicate expense"
                          onClick={(e) => {
                            e.stopPropagation();
                            const { id, created_at, updated_at, created_by, ...rest } = expense;
                            createExpense.mutate({ ...rest, title: `${expense.title} (copy)` });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
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

      {viewReceipt && (
        <ReceiptViewerDialog
          open={!!viewReceipt}
          onOpenChange={(open) => !open && setViewReceipt(null)}
          receiptUrl={viewReceipt.url}
          expenseTitle={viewReceipt.title}
        />
      )}
    </div>
  );
}

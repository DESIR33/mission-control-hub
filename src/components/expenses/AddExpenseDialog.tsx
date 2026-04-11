import { useState, useEffect, useRef, useCallback } from "react";
import { format, parse } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateExpense, useExpenses, type ExpenseCategory } from "@/hooks/use-expenses";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Upload, CalendarIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
}

interface ExpenseSignature {
  title: string;
  amount: number;
  category_id: string | null;
  vendor: string | null;
  is_tax_deductible: boolean;
  notes: string | null;
  count: number;
}

function useExpenseSignatures() {
  const { data: expenses = [] } = useExpenses();

  // Group by title (case-insensitive), pick the most recent values and most common amount
  const signatures: ExpenseSignature[] = [];
  const grouped = new Map<string, typeof expenses>();

  for (const e of expenses) {
    const key = (e.title || "").toLowerCase().trim();
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  for (const [, items] of grouped) {
    if (items.length === 0) continue;
    // Most recent entry for metadata
    const latest = items[0]; // already sorted desc by date
    // Most common amount
    const amountCounts = new Map<number, number>();
    for (const item of items) {
      amountCounts.set(item.amount, (amountCounts.get(item.amount) || 0) + 1);
    }
    let bestAmount = latest.amount;
    let bestCount = 0;
    for (const [amt, cnt] of amountCounts) {
      if (cnt > bestCount) { bestAmount = amt; bestCount = cnt; }
    }

    signatures.push({
      title: latest.title,
      amount: bestAmount,
      category_id: latest.category_id,
      vendor: latest.vendor,
      is_tax_deductible: latest.is_tax_deductible,
      notes: latest.notes,
      count: items.length,
    });
  }

  return signatures;
}

export function AddExpenseDialog({ open, onOpenChange, categories }: Props) {
  const { workspaceId } = useWorkspace();
  const createExpense = useCreateExpense();
  const signatures = useExpenseSignatures();
  const [uploading, setUploading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    category_id: "",
    vendor: "",
    notes: "",
    is_tax_deductible: false,
    receipt_url: null as string | null,
  });

  // Filter suggestions based on current title input
  const query = form.title.toLowerCase().trim();
  const suggestions = query.length >= 2
    ? signatures
        .filter((s) => s.title.toLowerCase().includes(query))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [];

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        titleRef.current && !titleRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applySuggestion = useCallback((sig: ExpenseSignature) => {
    setForm((f) => ({
      ...f,
      title: sig.title,
      amount: sig.amount.toFixed(2),
      category_id: sig.category_id || "",
      vendor: sig.vendor || "",
      is_tax_deductible: sig.is_tax_deductible,
      notes: sig.notes || "",
      // Keep existing date and receipt
    }));
    setAppliedSuggestion(sig.title);
    setShowSuggestions(false);
    setTimeout(() => setAppliedSuggestion(null), 3000);
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!workspaceId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${workspaceId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
      setForm((f) => ({ ...f, receipt_url: urlData.publicUrl }));
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.amount) return;
    await createExpense.mutateAsync({
      title: form.title,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      category_id: form.category_id || null,
      vendor: form.vendor || null,
      notes: form.notes || null,
      is_tax_deductible: form.is_tax_deductible,
      receipt_url: form.receipt_url,
    });
    setForm({
      title: "", amount: "", expense_date: new Date().toISOString().split("T")[0],
      category_id: "", vendor: "", notes: "", is_tax_deductible: false, receipt_url: null,
    });
    setAppliedSuggestion(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Title with smart suggestions */}
            <div className="space-y-1.5 relative">
              <Label>Title *</Label>
              <Input
                ref={titleRef}
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  setShowSuggestions(true);
                  setAppliedSuggestion(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. Adobe subscription"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md overflow-hidden"
                >
                  <div className="px-2.5 py-1.5 border-b bg-muted/30">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Similar expenses found
                    </p>
                  </div>
                  {suggestions.map((sig) => (
                    <button
                      key={sig.title}
                      onClick={() => applySuggestion(sig)}
                      className="w-full px-2.5 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sig.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {sig.vendor && `${sig.vendor} · `}
                          {sig.count} previous{sig.count !== 1 ? " records" : " record"}
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-foreground shrink-0">
                        ${sig.amount.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {appliedSuggestion && (
                <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
                  <Zap className="h-3 w-3" /> Pre-filled from history
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($) *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.expense_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.expense_date
                      ? format(parse(form.expense_date, "yyyy-MM-dd", new Date()), "PPP")
                      : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.expense_date ? parse(form.expense_date, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setForm({ ...form, expense_date: format(date, "yyyy-MM-dd") });
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Adobe, Amazon" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes..." />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : form.receipt_url ? "Receipt attached ✓" : "Upload receipt"}
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_tax_deductible} onCheckedChange={(v) => setForm({ ...form, is_tax_deductible: v })} />
            <Label>Tax deductible</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createExpense.isPending || !form.title || !form.amount}>
              {createExpense.isPending ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

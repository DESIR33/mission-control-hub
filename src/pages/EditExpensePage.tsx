import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parse } from "date-fns";
import { ArrowLeft, Receipt, Upload, Trash2, CalendarIcon, Eye } from "lucide-react";
import { CompanyPicker } from "@/components/expenses/CompanyPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExpenses, useUpdateExpense, useDeleteExpense, useExpenseCategories } from "@/hooks/use-expenses";

import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { ReceiptViewerDialog } from "@/components/expenses/ReceiptViewerDialog";
import { cn } from "@/lib/utils";

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { data: expenses = [] } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: companies = [] } = useCompanies();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const [uploading, setUploading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(false);

  const expense = expenses.find((e) => e.id === id);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    expense_date: "",
    category_id: "",
    vendor: "",
    notes: "",
    is_tax_deductible: false,
    receipt_url: null as string | null,
    company_id: "",
  });

  useEffect(() => {
    if (expense) {
      setForm({
        title: expense.title,
        amount: String(expense.amount),
        expense_date: expense.expense_date,
        category_id: expense.category_id || "",
        vendor: expense.vendor || "",
        notes: expense.notes || "",
        is_tax_deductible: expense.is_tax_deductible,
        receipt_url: expense.receipt_url,
        company_id: (expense as any).company_id || "",
      });
    }
  }, [expense]);

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
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.amount || !id) return;
    await updateExpense.mutateAsync({
      id,
      title: form.title,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      category_id: form.category_id || null,
      vendor: form.vendor || null,
      notes: form.notes || null,
      is_tax_deductible: form.is_tax_deductible,
      receipt_url: form.receipt_url,
      company_id: form.company_id || null,
    } as any);
    navigate("/finance/expenses/expenses");
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteExpense.mutateAsync(id);
    navigate("/finance/expenses/expenses");
  };

  if (!expense) {
    return (
      <div className="p-4 md:p-6 min-h-screen">
        <p className="text-muted-foreground">Expense not found.</p>
      </div>
    );
  }

  const taxReason = (expense as any).tax_deductible_reason;
  const taxStatus = (expense as any).tax_review_status;

  return (
    <div className="p-4 md:p-6 min-h-screen space-y-5">
      <button
        onClick={() => navigate("/finance/expenses/expenses")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Expenses
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">Edit Expense</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {taxStatus === "reviewed" && taxReason && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">AI Tax Assessment</span>
            <Badge variant={form.is_tax_deductible ? "default" : "secondary"} className="text-xs">
              {form.is_tax_deductible ? "Likely Deductible" : "Not Deductible"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{taxReason}</p>
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Amount ($) *</Label>
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
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
                    if (date) setForm({ ...form, expense_date: format(date, "yyyy-MM-dd") });
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
              <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Link to company..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No company</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      {c.logo_url && <img src={c.logo_url} alt="" className="w-4 h-4 rounded object-cover" />}
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Receipt</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground flex-1">
                <Upload className="h-4 w-4 shrink-0" />
                {uploading ? "Uploading..." : form.receipt_url ? "Receipt attached ✓" : "Upload receipt"}
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              </label>
              {form.receipt_url && (
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => setViewingReceipt(true)}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={form.is_tax_deductible} onCheckedChange={(v) => setForm({ ...form, is_tax_deductible: v })} />
          <Label>Tax deductible</Label>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => navigate("/finance/expenses/expenses")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateExpense.isPending || !form.title || !form.amount}>
            {updateExpense.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {viewingReceipt && form.receipt_url && (
        <ReceiptViewerDialog
          open={viewingReceipt}
          onOpenChange={setViewingReceipt}
          receiptUrl={form.receipt_url}
          expenseTitle={form.title}
        />
      )}
    </div>
  );
}

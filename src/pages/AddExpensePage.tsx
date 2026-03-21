import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateExpense, useExpenseCategories } from "@/hooks/use-expenses";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { TaxReviewBanner } from "@/components/expenses/TaxReviewBanner";

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const createExpense = useCreateExpense();
  const { data: categories = [] } = useExpenseCategories();
  const [uploading, setUploading] = useState(false);
  const [createdExpenseId, setCreatedExpenseId] = useState<string | null>(null);
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
    if (!form.title || !form.amount) return;
    const result = await createExpense.mutateAsync({
      title: form.title,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      category_id: form.category_id || null,
      vendor: form.vendor || null,
      notes: form.notes || null,
      is_tax_deductible: form.is_tax_deductible,
      receipt_url: form.receipt_url,
    });
    setCreatedExpenseId(result.id);
  };

  if (createdExpenseId) {
    return (
      <div className="p-4 md:p-6 min-h-screen">
        <div className="mx-auto max-w-2xl">
          <TaxReviewBanner
            expenseId={createdExpenseId}
            expenseTitle={form.title}
            expenseAmount={parseFloat(form.amount)}
            expenseVendor={form.vendor}
            expenseCategory={categories.find(c => c.id === form.category_id)?.name || ""}
            onDone={() => navigate("/finance/expenses/expenses")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen space-y-5">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/finance/expenses/expenses")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Expenses
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Receipt className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">New Expense</h1>
        </div>

        <div className="space-y-5 rounded-lg border border-border bg-card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Adobe subscription"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
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

          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Input
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="e.g. Adobe, Amazon"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes about this expense..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Receipt</Label>
            <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground w-fit">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : form.receipt_url ? "Receipt attached ✓" : "Upload receipt"}
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => navigate("/finance/expenses/expenses")}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createExpense.isPending || !form.title || !form.amount}
            >
              {createExpense.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

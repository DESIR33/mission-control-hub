import { useState } from "react";
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
import { useCreateExpense, type ExpenseCategory } from "@/hooks/use-expenses";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Upload, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
}

export function AddExpenseDialog({ open, onOpenChange, categories }: Props) {
  const { workspaceId } = useWorkspace();
  const createExpense = useCreateExpense();
  const [uploading, setUploading] = useState(false);
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
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Adobe subscription" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($) *</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
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

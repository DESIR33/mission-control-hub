import { useState, useMemo } from "react";
import {
  Plus, Send, RefreshCw, Download, Trash2, ExternalLink, FileText,
  DollarSign, Clock, Eye, AlertTriangle, CheckCircle, Pencil, Zap,
  Copy, Receipt, Mail,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import {
  useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice,
  useSendToStripe, useSyncInvoiceStatuses, useAutoGenerateInvoices,
  useNextInvoiceNumber, useSendInvoiceEmail, type Invoice, type InvoiceLineItem,
} from "@/hooks/use-invoices";
import { useDeals } from "@/hooks/use-deals";
import { useCompanies } from "@/hooks/use-companies";
import { exportData } from "@/lib/export-utils";

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", icon: Send, className: "bg-blue-500/20 text-blue-400" },
  viewed: { label: "Viewed", icon: Eye, className: "bg-purple-500/20 text-purple-400" },
  paid: { label: "Paid", icon: CheckCircle, className: "bg-green-500/20 text-green-400" },
  overdue: { label: "Overdue", icon: AlertTriangle, className: "bg-red-500/20 text-red-400" },
  void: { label: "Void", icon: Trash2, className: "bg-muted text-muted-foreground line-through" },
};

function fmtCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── PDF Export (client-side HTML→print) ──
function generateInvoicePDF(invoice: Invoice) {
  const lineItems = invoice.line_items || [];
  const w = window.open("", "_blank");
  if (!w) { toast.error("Please allow pop-ups to export PDF"); return; }

  w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoice_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand h1 { font-size: 24px; font-weight: 700; }
  .brand p { font-size: 12px; color: #666; margin-top: 4px; white-space: pre-line; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 28px; color: #2563eb; font-weight: 700; }
  .invoice-meta p { font-size: 12px; color: #666; margin-top: 2px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
  .party p { font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f8f9fa; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5e7eb; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; }
  th.amount { text-align: right; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 250px; }
  .totals-table .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals-table .row.total { border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 16px; padding-top: 10px; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 11px; color: #999; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .status-paid { background: #dcfce7; color: #15803d; }
  .status-sent { background: #dbeafe; color: #1d4ed8; }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-overdue { background: #fef2f2; color: #dc2626; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <div class="brand">
      ${invoice.brand_logo_url ? `<img src="${escapeHtml(invoice.brand_logo_url)}" alt="" style="height:40px;margin-bottom:8px;">` : ""}
      <h1>${escapeHtml(invoice.brand_name || "Your Company")}</h1>
      <p>${escapeHtml(invoice.brand_address || "")}</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>${escapeHtml(invoice.invoice_number)}</strong></p>
      <p>Issued: ${invoice.issued_date ? format(parseISO(invoice.issued_date), "MMM d, yyyy") : "—"}</p>
      <p>Due: ${invoice.due_date ? format(parseISO(invoice.due_date), "MMM d, yyyy") : "—"}</p>
      <p style="margin-top:8px"><span class="status-badge status-${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span></p>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p><strong>${escapeHtml(invoice.client_name || "—")}</strong></p>
      <p>${escapeHtml(invoice.client_email || "")}</p>
      <p>${escapeHtml(invoice.client_address || "")}</p>
    </div>
    <div class="party" style="text-align:right">
      <h3>Payment Terms</h3>
      <p>${escapeHtml(invoice.payment_terms || "Net 30")}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="amount">Qty</th><th class="amount">Rate</th><th class="amount">Amount</th></tr></thead>
    <tbody>
      ${lineItems.length > 0 ? lineItems.map((item: InvoiceLineItem) => `
        <tr>
          <td>${item.description}</td>
          <td class="amount">${item.quantity}</td>
          <td class="amount">${fmtCurrency(item.amount, invoice.currency)}</td>
          <td class="amount">${fmtCurrency(item.amount * item.quantity, invoice.currency)}</td>
        </tr>
      `).join("") : `<tr><td colspan="4" style="text-align:center;color:#999">No line items</td></tr>`}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-table">
      <div class="row"><span>Subtotal</span><span>${fmtCurrency(invoice.amount, invoice.currency)}</span></div>
      ${invoice.tax_rate > 0 ? `<div class="row"><span>Tax (${invoice.tax_rate}%)</span><span>${fmtCurrency(invoice.tax_amount, invoice.currency)}</span></div>` : ""}
      <div class="row total"><span>Total</span><span>${fmtCurrency(invoice.total_amount, invoice.currency)}</span></div>
    </div>
  </div>
  ${invoice.notes ? `<div class="footer"><p><strong>Notes:</strong> ${invoice.notes}</p></div>` : ""}
  ${invoice.stripe_payment_url ? `<div class="footer"><p>Pay online: <a href="${invoice.stripe_payment_url}">${invoice.stripe_payment_url}</a></p></div>` : ""}
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ── Create/Edit Invoice Dialog ──
function InvoiceFormDialog({
  invoice,
  open,
  onClose,
  nextNumber,
}: {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  nextNumber: string;
}) {
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { data: deals = [] } = useDeals();
  const { data: companies = [] } = useCompanies();
  const isEditing = !!invoice;

  const closedDeals = deals.filter((d) => d.stage === "closed_won");

  const [form, setForm] = useState({
    invoice_number: "",
    deal_id: "",
    company_id: "",
    client_name: "",
    client_email: "",
    client_address: "",
    amount: "",
    currency: "USD",
    tax_rate: "0",
    payment_terms: "Net 30",
    due_date: "",
    notes: "",
    brand_name: "",
    brand_address: "",
    brand_logo_url: "",
    line_items: [{ description: "", quantity: 1, amount: 0 }] as InvoiceLineItem[],
  });

  // Populate on open
  useState(() => {
    if (invoice && open) {
      setForm({
        invoice_number: invoice.invoice_number,
        deal_id: invoice.deal_id || "",
        company_id: invoice.company_id || "",
        client_name: invoice.client_name || "",
        client_email: invoice.client_email || "",
        client_address: invoice.client_address || "",
        amount: String(invoice.amount),
        currency: invoice.currency,
        tax_rate: String(invoice.tax_rate),
        payment_terms: invoice.payment_terms,
        due_date: invoice.due_date || "",
        notes: invoice.notes || "",
        brand_name: invoice.brand_name || "",
        brand_address: invoice.brand_address || "",
        brand_logo_url: invoice.brand_logo_url || "",
        line_items: invoice.line_items?.length ? invoice.line_items : [{ description: "", quantity: 1, amount: 0 }],
      });
    } else if (!invoice && open) {
      setForm((f) => ({
        ...f,
        invoice_number: nextNumber,
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      }));
    }
  });

  // Auto-fill from deal selection
  const handleDealChange = (dealId: string) => {
    setForm((f) => ({ ...f, deal_id: dealId }));
    const deal = deals.find((d) => d.id === dealId);
    if (deal) {
      setForm((f) => ({
        ...f,
        amount: String(deal.value || 0),
        company_id: deal.company_id || "",
        client_name: deal.company?.name || "",
        client_email: deal.contact?.email || "",
        line_items: [{ description: deal.title, quantity: 1, amount: deal.value || 0 }],
      }));
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setForm((f) => ({ ...f, company_id: companyId }));
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setForm((f) => ({ ...f, client_name: company.name }));
    }
  };

  const subtotal = form.line_items.reduce((s, i) => s + i.amount * i.quantity, 0);
  const taxAmt = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const total = subtotal + taxAmt;

  const handleSave = () => {
    if (!form.invoice_number.trim()) { toast.error("Invoice number required"); return; }

    const payload = {
      invoice_number: form.invoice_number.trim(),
      deal_id: form.deal_id || null,
      company_id: form.company_id || null,
      client_name: form.client_name || null,
      client_email: form.client_email || null,
      client_address: form.client_address || null,
      amount: subtotal,
      currency: form.currency,
      tax_rate: parseFloat(form.tax_rate) || 0,
      tax_amount: taxAmt,
      total_amount: total,
      payment_terms: form.payment_terms,
      due_date: form.due_date || null,
      notes: form.notes || null,
      brand_name: form.brand_name || null,
      brand_address: form.brand_address || null,
      brand_logo_url: form.brand_logo_url || null,
      line_items: form.line_items.filter((i) => i.description.trim()),
    };

    if (isEditing) {
      updateInvoice.mutate({ id: invoice!.id, ...payload } as any, {
        onSuccess: () => { onClose(); toast.success("Invoice updated"); },
      });
    } else {
      createInvoice.mutate(payload as any, {
        onSuccess: () => { onClose(); toast.success("Invoice created"); },
      });
    }
  };

  const addLineItem = () => {
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { description: "", quantity: 1, amount: 0 }],
    }));
  };

  const updateLineItem = (idx: number, field: keyof InvoiceLineItem, value: any) => {
    setForm((f) => ({
      ...f,
      line_items: f.line_items.map((item, i) =>
        i === idx ? { ...item, [field]: field === "description" ? value : Number(value) || 0 } : item,
      ),
    }));
  };

  const removeLineItem = (idx: number) => {
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update invoice details." : "Generate a new invoice for a sponsorship deal."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Invoice Number</Label>
              <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link to Deal */}
          {closedDeals.length > 0 && (
            <div>
              <Label className="text-xs">Link to Deal (optional)</Label>
              <Select value={form.deal_id} onValueChange={handleDealChange}>
                <SelectTrigger><SelectValue placeholder="Select a closed deal…" /></SelectTrigger>
                <SelectContent>
                  {closedDeals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title} — {fmtCurrency(d.value || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client / Company</Label>
              <Select value={form.company_id} onValueChange={handleCompanyChange}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Client Name</Label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client Email</Label>
              <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Client Address</Label>
              <Input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Line Items</Label>
              <Button size="sm" variant="ghost" onClick={addLineItem} className="h-6 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {form.line_items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Description"
                    className="flex-1"
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                  />
                  <Input
                    type="number" placeholder="Qty" className="w-16"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                  />
                  <Input
                    type="number" placeholder="Rate" className="w-24" step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(idx, "amount", e.target.value)}
                  />
                  <span className="text-xs font-mono w-20 text-right text-foreground">
                    {fmtCurrency(item.amount * item.quantity, form.currency)}
                  </span>
                  {form.line_items.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLineItem(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Terms */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Payment Terms</Label>
              <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>

          {/* Branding */}
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Branding (appears on PDF)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Business Name</Label>
                <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Logo URL</Label>
                <Input value={form.brand_logo_url} onChange={(e) => setForm({ ...form, brand_logo_url: e.target.value })} />
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-xs">Business Address</Label>
              <Textarea rows={2} value={form.brand_address} onChange={(e) => setForm({ ...form, brand_address: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment instructions, thank you note, etc." />
          </div>

          {/* Totals preview */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-xs"><span>Subtotal</span><span className="font-mono">{fmtCurrency(subtotal, form.currency)}</span></div>
            {parseFloat(form.tax_rate) > 0 && (
              <div className="flex justify-between text-xs"><span>Tax ({form.tax_rate}%)</span><span className="font-mono">{fmtCurrency(taxAmt, form.currency)}</span></div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-border pt-1"><span>Total</span><span className="font-mono">{fmtCurrency(total, form.currency)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={createInvoice.isPending || updateInvoice.isPending}>
            {createInvoice.isPending || updateInvoice.isPending ? "Saving…" : isEditing ? "Update Invoice" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──
export function InvoiceGenerator() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: nextNumber = "INV-0001" } = useNextInvoiceNumber();
  const sendToStripe = useSendToStripe();
  const sendInvoiceEmail = useSendInvoiceEmail();
  const syncStatuses = useSyncInvoiceStatuses();
  const autoGenerate = useAutoGenerateInvoices();
  const deleteInvoice = useDeleteInvoice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = invoices.filter((inv) => filter === "all" || inv.status === filter);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
    const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0);
    const outstanding = invoices.filter((i) => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total_amount), 0);
    const overdue = invoices.filter((i) => i.status === "overdue" || (i.due_date && isPast(parseISO(i.due_date)) && !["paid", "void"].includes(i.status))).length;
    return { total, paid, outstanding, overdue };
  }, [invoices]);

  const handleExportCSV = () => {
    const columns = [
      { key: "invoice_number", label: "Invoice #" },
      { key: "status", label: "Status" },
      { key: "client_name", label: "Client" },
      { key: "amount", label: "Amount" },
      { key: "tax_amount", label: "Tax" },
      { key: "total_amount", label: "Total" },
      { key: "currency", label: "Currency" },
      { key: "issued_date", label: "Issued" },
      { key: "due_date", label: "Due" },
      { key: "paid_date", label: "Paid" },
    ];
    exportData(invoices, columns, "invoices", "csv");
    toast.success("Invoices exported as CSV");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Receipt className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-2xl font-bold font-mono text-foreground">{invoices.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Invoices</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-400" />
          <p className="text-2xl font-bold font-mono text-green-400">{fmtCurrency(stats.paid)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Paid</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-blue-400" />
          <p className="text-2xl font-bold font-mono text-blue-400">{fmtCurrency(stats.outstanding)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Outstanding</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-red-400" />
          <p className="text-2xl font-bold font-mono text-red-400">{stats.overdue}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</p>
        </CardContent></Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} results</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleExportCSV} disabled={invoices.length === 0}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
          <Button
            size="sm" variant="outline" className="gap-1 text-xs"
            onClick={() => syncStatuses.mutate(undefined, {
              onSuccess: (d: any) => toast.success(`Synced — ${d.updated} invoices updated`),
              onError: (e: any) => toast.error(e?.message || "Sync failed"),
            })}
            disabled={syncStatuses.isPending}
          >
            <RefreshCw className={`w-3 h-3 ${syncStatuses.isPending ? "animate-spin" : ""}`} /> Sync Stripe
          </Button>
          <Button
            size="sm" variant="outline" className="gap-1 text-xs"
            onClick={() => autoGenerate.mutate(undefined, {
              onSuccess: (d) => toast.success(d.created > 0 ? `Auto-generated ${d.created} invoices: ${d.invoice_numbers.join(", ")}` : "No new closed deals to invoice"),
              onError: (e: any) => toast.error(e?.message || "Failed"),
            })}
            disabled={autoGenerate.isPending}
          >
            <Zap className={`w-3 h-3 ${autoGenerate.isPending ? "animate-spin" : ""}`} /> Auto-Generate
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { setEditInvoice(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            {invoices.length === 0 ? 'No invoices yet. Click "New Invoice" or "Auto-Generate" to create from closed deals.' : "No invoices match this filter."}
          </p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Issued</TableHead>
                    <TableHead className="text-xs">Due</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                    const StatusIcon = sc.icon;
                    const isOverdue = inv.due_date && isPast(parseISO(inv.due_date)) && !["paid", "void"].includes(inv.status);
                    return (
                      <TableRow key={inv.id} className="group">
                        <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium text-foreground">{inv.client_name || "—"}</p>
                            {inv.client_email && <p className="text-[10px] text-muted-foreground">{inv.client_email}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${isOverdue && inv.status !== "overdue" ? STATUS_CONFIG.overdue.className : sc.className} border-transparent text-[10px] gap-1`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {isOverdue && inv.status !== "overdue" ? "Overdue" : sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium">
                          {fmtCurrency(Number(inv.total_amount), inv.currency)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.issued_date ? format(parseISO(inv.issued_date), "MMM d") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {inv.due_date ? format(parseISO(inv.due_date), "MMM d") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => generateInvoicePDF(inv)} title="Export PDF">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7" title={inv.client_email ? `Email invoice to ${inv.client_email}` : "No client email set"}
                              disabled={!inv.client_email || sendInvoiceEmail.isPending}
                              onClick={() => sendInvoiceEmail.mutate(inv.id, {
                                onSuccess: () => toast.success(`Invoice ${inv.invoice_number} emailed to ${inv.client_email}`),
                                onError: (e: any) => toast.error(e?.message || "Failed to send email"),
                              })}
                            >
                              <Mail className="w-3 h-3" />
                            </Button>
                            {inv.stripe_payment_url && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Payment Link">
                                <a href={inv.stripe_payment_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>
                              </Button>
                            )}
                            {inv.status === "draft" && (
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7" title="Send via Stripe"
                                onClick={() => sendToStripe.mutate(inv.id, {
                                  onSuccess: () => toast.success(`Invoice ${inv.invoice_number} sent via Stripe`),
                                  onError: (e: any) => toast.error(e?.message || "Failed to send"),
                                })}
                                disabled={sendToStripe.isPending}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditInvoice(inv); setDialogOpen(true); }} title="Edit">
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete invoice {inv.invoice_number}?</AlertDialogTitle>
                                  <AlertDialogDescription>This cannot be undone. The Stripe invoice (if created) will not be voided automatically.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteInvoice.mutate(inv.id, { onSuccess: () => toast.success("Invoice deleted") })}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <InvoiceFormDialog
        invoice={editInvoice}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditInvoice(null); }}
        nextNumber={nextNumber}
      />
    </div>
  );
}

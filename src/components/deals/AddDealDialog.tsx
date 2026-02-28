import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDeal } from "@/hooks/use-deals";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDealDialog({ open, onOpenChange }: AddDealDialogProps) {
import { Plus, Loader2 } from "lucide-react";

export function AddDealDialog() {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [stage, setStage] = useState("prospecting");
  const [forecastCategory, setForecastCategory] = useState<string>("");

  const createDeal = useCreateDeal();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    value: "",
    currency: "USD",
    stage: "prospecting",
    contact_id: "",
    company_id: "",
    expected_close_date: "",
    notes: "",
  });

  const reset = () =>
    setForm({
      title: "",
      value: "",
      currency: "USD",
      stage: "prospecting",
      contact_id: "",
      company_id: "",
      expected_close_date: "",
      notes: "",
    });

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    createDeal.mutate(
      {
        title: form.title,
        value: form.value ? Number(form.value) : null,
        currency: form.currency,
        stage: form.stage,
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Deal created" });
          reset();
          onOpenChange(false);
        },
        onError: (err) =>
          toast({
            title: "Failed to create deal",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Title *</Label>
            <Input
              id="deal-title"
              placeholder="e.g. NordVPN Q2 Sponsorship"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deal-value">Value</Label>
              <Input
                id="deal-value"
                type="number"
                placeholder="5000"
                value={form.value}
                onChange={(e) =>
                  setForm((p) => ({ ...p, value: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-currency">Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger id="deal-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select
              value={form.stage}
              onValueChange={(v) => setForm((p) => ({ ...p, stage: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospecting">Prospecting</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select
                value={form.contact_id}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, contact_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={form.company_id}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, company_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await createDeal.mutateAsync({
        title: form.get("title") as string,
        value: form.get("value") ? Number(form.get("value")) : undefined,
        currency: (form.get("currency") as string) || "USD",
        stage,
        forecast_category: forecastCategory && forecastCategory !== "none" ? forecastCategory : undefined,
        contact_id: contactId && contactId !== "none" ? contactId : undefined,
        company_id: companyId && companyId !== "none" ? companyId : undefined,
        expected_close_date: (form.get("expected_close_date") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Deal created" });
      setContactId("");
      setCompanyId("");
      setStage("prospecting");
      setForecastCategory("");
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="deal_title">Deal Title *</Label>
            <Input id="deal_title" name="title" required className="bg-secondary border-border" placeholder="e.g. Enterprise License Q1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal_value">Value</Label>
              <Input id="deal_value" name="value" type="number" step="0.01" min="0" className="bg-secondary border-border" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal_currency">Currency</Label>
              <Input id="deal_currency" name="currency" defaultValue="USD" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Forecast</Label>
              <Select value={forecastCategory} onValueChange={setForecastCategory}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pipeline">Pipeline</SelectItem>
                  <SelectItem value="best_case">Best Case</SelectItem>
                  <SelectItem value="commit">Commit</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-close-date">Expected Close Date</Label>
            <Input
              id="deal-close-date"
              type="date"
              value={form.expected_close_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, expected_close_date: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea
              id="deal-notes"
              placeholder="Additional details..."
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createDeal.isPending}>
            {createDeal.isPending ? "Creating..." : "Create Deal"}
          </Button>
        </DialogFooter>
          <div className="space-y-1.5">
            <Label htmlFor="expected_close_date">Expected Close Date</Label>
            <Input id="expected_close_date" name="expected_close_date" type="date" className="bg-secondary border-border" />
          </div>

          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Contact</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Company</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal_notes">Notes</Label>
            <Textarea id="deal_notes" name="notes" rows={2} className="bg-secondary border-border" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createDeal.isPending}>
              {createDeal.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

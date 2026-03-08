import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCreateDeal } from "@/hooks/use-deals";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
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
      setVideoQueueId("");
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
            <Input id="deal_title" name="title" required className="bg-secondary border-border" placeholder="e.g. NordVPN Q2 Sponsorship" />
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

          <div className="space-y-1.5">
            <Label>Linked Video</Label>
            <Select value={videoQueueId} onValueChange={setVideoQueueId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select video (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Video</SelectItem>
                {videos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expected_close_date">Expected Close Date</Label>
            <Input id="expected_close_date" name="expected_close_date" type="date" className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

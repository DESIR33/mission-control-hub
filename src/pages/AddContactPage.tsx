import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateContact } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { WorkspaceProvider } from "@/hooks/use-workspace";

function AddContactForm() {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string>("");
  const createContact = useCreateContact();
  const { data: companies = [] } = useCompanies();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await createContact.mutateAsync({
        first_name: form.get("first_name") as string,
        last_name: (form.get("last_name") as string) || undefined,
        email: (form.get("email") as string) || undefined,
        phone: (form.get("phone") as string) || undefined,
        status: form.get("status") as string,
        role: (form.get("role") as string) || undefined,
        source: (form.get("source") as string) || undefined,
        company_id: companyId && companyId !== "none" ? companyId : undefined,
        vip_tier: form.get("vip_tier") as string,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Contact created" });
      navigate("/relationships");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 gradient-mesh min-h-screen">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/relationships")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Relationships
        </button>

        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">New Contact</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" name="first_name" required className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" name="last_name" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select name="status" defaultValue="lead">
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>VIP Tier</Label>
              <Select name="vip_tier" defaultValue="none">
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="silver">{"\u{1F948}"} Silver</SelectItem>
                  <SelectItem value="gold">{"\u{1F947}"} Gold</SelectItem>
                  <SelectItem value="platinum">{"\u{1F48E}"} Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" name="role" placeholder="e.g. VP Marketing" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" placeholder="e.g. LinkedIn" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Company</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} className="bg-secondary border-border" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Contact
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/relationships")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddContactPage() {
  return (
    <WorkspaceProvider>
      <AddContactForm />
    </WorkspaceProvider>
  );
}

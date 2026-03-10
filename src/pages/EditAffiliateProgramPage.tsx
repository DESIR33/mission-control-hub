import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export default function EditAffiliateProgramPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();

  const [formData, setFormData] = useState({
    companyId: "",
    dashboardUrl: "",
    commissionPercentage: 0,
    payoutFrequency: "monthly",
    nextPayoutDate: "",
    affiliateLinks: "",
    minimumPayout: 0,
    paymentMethods: "",
    notes: "",
  });

  const { data: program } = useQuery({
    queryKey: ["affiliate-program", id, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_programs")
        .select("*")
        .eq("id", id!)
        .eq("workspace_id", workspaceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!workspaceId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("workspace_id", workspaceId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (program) {
      const links = Array.isArray(program.affiliate_links) ? program.affiliate_links : [];
      const methods = Array.isArray(program.payment_methods) ? program.payment_methods : [];
      setFormData({
        companyId: program.company_id || "",
        dashboardUrl: program.dashboard_url || "",
        commissionPercentage: program.commission_percentage,
        payoutFrequency: program.payout_frequency || "monthly",
        nextPayoutDate: program.next_payout_date
          ? String(program.next_payout_date).split("T")[0]
          : "",
        affiliateLinks: links.join("\n"),
        minimumPayout: program.minimum_payout || 0,
        paymentMethods: methods.join(", "),
        notes: program.notes || "",
      });
    }
  }, [program]);

  const updateProgram = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("affiliate_programs")
        .update({
          company_id: formData.companyId || null,
          dashboard_url: formData.dashboardUrl || null,
          commission_percentage: parseFloat(formData.commissionPercentage.toString()),
          payout_frequency: formData.payoutFrequency,
          next_payout_date: formData.nextPayoutDate || null,
          affiliate_links: formData.affiliateLinks
            ? formData.affiliateLinks.split("\n").filter((l) => l.trim())
            : [],
          minimum_payout: parseFloat(formData.minimumPayout.toString()),
          payment_methods: formData.paymentMethods
            ? formData.paymentMethods.split(",").map((m) => m.trim()).filter(Boolean)
            : [],
          notes: formData.notes || null,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-program", id] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast({
        title: "Success",
        description: "Affiliate program updated successfully",
      });
      navigate(`/affiliate-program/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!program) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container px-4 md:px-8 py-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/affiliate-program/${id}`)}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Program
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Edit Affiliate Program
            </h1>
            <p className="text-muted-foreground text-lg">
              Update program details and configuration
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-8 py-8 max-w-2xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateProgram.mutateAsync();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="companyId">Company</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) =>
                  setFormData({ ...formData, companyId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboardUrl">Dashboard URL</Label>
              <Input
                id="dashboardUrl"
                type="url"
                placeholder="https://affiliate-dashboard.example.com"
                value={formData.dashboardUrl}
                onChange={(e) =>
                  setFormData({ ...formData, dashboardUrl: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commissionPercentage">Commission Rate (%)</Label>
                <Input
                  id="commissionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commissionPercentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commissionPercentage: parseFloat(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumPayout">Minimum Payout ($)</Label>
                <Input
                  id="minimumPayout"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimumPayout}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumPayout: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payoutFrequency">Payout Frequency</Label>
                <Select
                  value={formData.payoutFrequency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payoutFrequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextPayoutDate">Next Payout Date</Label>
                <Input
                  id="nextPayoutDate"
                  type="date"
                  value={formData.nextPayoutDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nextPayoutDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliateLinks">Affiliate Links (one per line)</Label>
              <Textarea
                id="affiliateLinks"
                placeholder="https://example.com/ref=yourcode"
                value={formData.affiliateLinks}
                onChange={(e) =>
                  setFormData({ ...formData, affiliateLinks: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethods">Payment Methods (comma-separated)</Label>
              <Input
                id="paymentMethods"
                placeholder="PayPal, Bank Transfer, Stripe"
                value={formData.paymentMethods}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethods: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this affiliate program..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/affiliate-program/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProgram.isPending}>
                {updateProgram.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/use-companies";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export default function NewAffiliateProgramPage() {
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

  const { data: companies = [] } = useCompanies();

  const createProgram = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("affiliate_programs")
        .insert({
          workspace_id: workspaceId,
          company_id: formData.companyId || null,
          dashboard_url: formData.dashboardUrl || null,
          commission_percentage: parseFloat(formData.commissionPercentage.toString()) || 0,
          payout_frequency: formData.payoutFrequency,
          next_payout_date: formData.nextPayoutDate || null,
          affiliate_links: formData.affiliateLinks
            ? formData.affiliateLinks.split("\n").filter((l) => l.trim())
            : [],
          minimum_payout: parseFloat(formData.minimumPayout.toString()) || 0,
          payment_methods: formData.paymentMethods
            ? formData.paymentMethods.split(",").map((m) => m.trim()).filter(Boolean)
            : [],
          notes: formData.notes || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast({ title: "Success", description: "Affiliate program created successfully" });
      navigate("/monetization?tab=affiliate");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/monetization")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Monetization
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Link2 className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">New Affiliate Program</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
            <CardDescription>Set up a new affiliate program relationship</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await createProgram.mutateAsync();
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="companyId">Company</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => setFormData({ ...formData, companyId: value })}
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
                  onChange={(e) => setFormData({ ...formData, dashboardUrl: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) })
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
                      setFormData({ ...formData, minimumPayout: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payoutFrequency">Payout Frequency</Label>
                  <Select
                    value={formData.payoutFrequency}
                    onValueChange={(value) => setFormData({ ...formData, payoutFrequency: value })}
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
                    onChange={(e) => setFormData({ ...formData, nextPayoutDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="affiliateLinks">Affiliate Links (one per line)</Label>
                <Textarea
                  id="affiliateLinks"
                  placeholder="https://example.com/ref=yourcode"
                  value={formData.affiliateLinks}
                  onChange={(e) => setFormData({ ...formData, affiliateLinks: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethods">Payment Methods (comma-separated)</Label>
                <Input
                  id="paymentMethods"
                  placeholder="PayPal, Bank Transfer, Stripe"
                  value={formData.paymentMethods}
                  onChange={(e) => setFormData({ ...formData, paymentMethods: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this affiliate program..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/monetization")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProgram.isPending}>
                  {createProgram.isPending ? "Creating..." : "Create Program"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

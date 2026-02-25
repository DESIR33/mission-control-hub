import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: number;
  name: string;
}

export default function NewAffiliateProgramPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const createProgram = useMutation({
    mutationFn: async () => {
      const csrfResponse = await fetch("/api/csrf/token");
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch("/api/affiliate-programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          companyId: parseInt(formData.companyId),
          dashboardUrl: formData.dashboardUrl,
          commissionPercentage: parseFloat(
            formData.commissionPercentage.toString()
          ),
          payoutFrequency: formData.payoutFrequency,
          nextPayoutDate: formData.nextPayoutDate || null,
          affiliateLinks: formData.affiliateLinks
            ? formData.affiliateLinks.split("\n").filter((l) => l.trim())
            : [],
          minimumPayout: parseFloat(formData.minimumPayout.toString()),
          paymentMethods: formData.paymentMethods
            ? formData.paymentMethods.split(",").map((m) => m.trim()).filter(Boolean)
            : [],
          notes: formData.notes || null,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/affiliate-programs"],
      });
      toast({
        title: "Success",
        description: "Affiliate program created successfully",
      });
      navigate("/monetization");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container px-4 md:px-8 py-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => navigate("/monetization")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-gray-700 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-95 active:scale-90 font-medium"
              >
                ← Back to Monetization
              </button>
            </div>
            <h1 className="text-4xl font-bold text-white">
              New Affiliate Program
            </h1>
            <p className="text-gray-400 text-lg">
              Set up a new affiliate program relationship
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-8 py-8 max-w-2xl">
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border/50">
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
                onValueChange={(value) =>
                  setFormData({ ...formData, companyId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem
                      key={company.id}
                      value={company.id.toString()}
                    >
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
                <Label htmlFor="commissionPercentage">
                  Commission Rate (%)
                </Label>
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
              <Label htmlFor="affiliateLinks">
                Affiliate Links (one per line)
              </Label>
              <Textarea
                id="affiliateLinks"
                placeholder="https://example.com/ref=yourcode"
                value={formData.affiliateLinks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    affiliateLinks: e.target.value,
                  })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethods">
                Payment Methods (comma-separated)
              </Label>
              <Input
                id="paymentMethods"
                placeholder="PayPal, Bank Transfer, Stripe"
                value={formData.paymentMethods}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMethods: e.target.value,
                  })
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
              <button
                type="button"
                onClick={() => navigate("/monetization")}
                className="px-6 py-3 rounded-xl bg-gray-800 text-gray-300 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-gray-700 transition-all duration-300 hover:scale-95 active:scale-90 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createProgram.isPending}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-primary/30 transition-all duration-300 hover:scale-95 active:scale-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createProgram.isPending
                  ? "Creating..."
                  : "Create Program"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

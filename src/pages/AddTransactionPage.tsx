import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AffiliateProgram {
  id: number;
  companyId: number;
  commissionPercentage: number;
}

interface Company {
  id: number;
  name: string;
}

export default function AddTransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    commission: 0,
    approximatePayoutDate: "",
    isRecurring: false,
    recurringMonths: 1,
  });

  const { data: program } = useQuery<AffiliateProgram>({
    queryKey: [`/api/affiliate-programs/${id}`],
  });

  const { data: company } = useQuery<Company>({
    queryKey: [`/api/companies/${program?.companyId}`],
    enabled: !!program?.companyId,
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const csrfResponse = await fetch("/api/csrf/token");
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(
        `/api/affiliate-programs/${id}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            ...formData,
            commission: parseFloat(formData.commission.toString()),
            affiliateProgramId: parseInt(id!),
            recurringMonths: formData.isRecurring
              ? formData.recurringMonths
              : null,
            status: "pending",
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/affiliate-programs/${id}/transactions`],
      });
      toast({
        title: "Success",
        description: "Transaction added successfully",
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
            <h1 className="text-4xl font-bold text-foreground">Add Transaction</h1>
            <p className="text-muted-foreground text-lg">
              {company?.name ? `Record a new commission for ${company.name}` : "Record a new commission transaction"}
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-8 py-8 max-w-2xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await createTransaction.mutateAsync();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Transaction Date</Label>
              <Input
                id="transactionDate"
                type="date"
                value={formData.transactionDate}
                onChange={(e) =>
                  setFormData({ ...formData, transactionDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">Commission Amount ($)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                step="0.01"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission: parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approximatePayoutDate">
                Approximate Payout Date
              </Label>
              <Input
                id="approximatePayoutDate"
                type="date"
                value={formData.approximatePayoutDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    approximatePayoutDate: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isRecurring: checked })
                }
              />
              <Label htmlFor="isRecurring">Recurring Transaction</Label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="recurringMonths">Number of Months</Label>
                <Input
                  id="recurringMonths"
                  type="number"
                  min="1"
                  value={formData.recurringMonths}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurringMonths: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/affiliate-program/${id}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending
                  ? "Adding..."
                  : "Add Transaction"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

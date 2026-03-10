import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [payoutDate, setPayoutDate] = useState<Date | undefined>();
  const [commission, setCommission] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState(1);

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
            transactionDate: format(transactionDate, "yyyy-MM-dd"),
            commission: parseFloat(commission.toString()),
            approximatePayoutDate: payoutDate ? format(payoutDate, "yyyy-MM-dd") : "",
            isRecurring,
            affiliateProgramId: parseInt(id!),
            recurringMonths: isRecurring ? recurringMonths : null,
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <div>
        <button
          onClick={() => navigate(`/affiliate-program/${id}`)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Program
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Add Transaction
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {company?.name
            ? `Record a new commission for ${company.name}`
            : "Record a new commission transaction"}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await createTransaction.mutateAsync();
              }}
              className="space-y-6"
            >
              {/* Transaction Date */}
              <div className="space-y-2">
                <Label>Transaction Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate
                        ? format(transactionDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(d) => d && setTransactionDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Commission */}
              <div className="space-y-2">
                <Label htmlFor="commission">Commission Amount ($)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  step="0.01"
                  value={commission}
                  onChange={(e) => setCommission(parseFloat(e.target.value))}
                  required
                />
              </div>

              {/* Payout Date */}
              <div className="space-y-2">
                <Label>Approximate Payout Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !payoutDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {payoutDate
                        ? format(payoutDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={payoutDate}
                      onSelect={setPayoutDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Recurring */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
                <Label htmlFor="isRecurring">Recurring Transaction</Label>
              </div>

              {isRecurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurringMonths">Number of Months</Label>
                  <Input
                    id="recurringMonths"
                    type="number"
                    min="1"
                    value={recurringMonths}
                    onChange={(e) =>
                      setRecurringMonths(parseInt(e.target.value))
                    }
                    required
                  />
                </div>
              )}

              {/* Actions */}
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
                  {createTransaction.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    "Add Transaction"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

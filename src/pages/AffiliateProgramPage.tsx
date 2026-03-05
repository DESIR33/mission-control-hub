import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleDollarSign, Calendar, BarChart3, Check, X, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCompanies } from "@/hooks/use-companies";
import {
  useAffiliateTransactions,
  useCreateAffiliateTransaction,
  useUpdateAffiliateTransaction,
  type AffiliateTransaction,
} from "@/hooks/use-affiliate-transactions";

export default function AffiliateProgramPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    commission: 0,
    approximatePayoutDate: "",
    isRecurring: false,
    recurringMonths: 0,
  });

  // Fetch the affiliate program
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ["affiliate-program", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_programs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Get company name
  const { data: companies = [] } = useCompanies();
  const company = useMemo(
    () => companies.find((c) => c.id === program?.company_id),
    [companies, program?.company_id]
  );

  // Fetch transactions for this program
  const { data: allTransactions = [] } = useAffiliateTransactions();
  const transactions = useMemo(
    () => allTransactions.filter((t) => t.affiliate_program_id === id),
    [allTransactions, id]
  );

  const createTx = useCreateAffiliateTransaction();
  const updateTx = useUpdateAffiliateTransaction();

  // Mark as paid
  const markAsPaid = useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await supabase
        .from("affiliate_transactions" as any)
        .update({ status: "paid" })
        .eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-transactions"] });
      toast({ title: "Success", description: "Transaction marked as paid" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<AffiliateTransaction> = {
      affiliate_program_id: id!,
      amount: transactionData.commission,
      transaction_date: transactionData.transactionDate,
      status: "pending",
      description: transactionData.isRecurring
        ? `Recurring (${transactionData.recurringMonths} months)`
        : null,
      metadata: {
        approximate_payout_date: transactionData.approximatePayoutDate || null,
        is_recurring: transactionData.isRecurring,
        recurring_months: transactionData.isRecurring ? transactionData.recurringMonths : null,
      } as any,
    };

    if (editingTransactionId) {
      await updateTx.mutateAsync({ id: editingTransactionId, ...payload });
    } else {
      await createTx.mutateAsync(payload);
    }
    setIsAddingTransaction(false);
    setEditingTransactionId(null);
    setTransactionData({
      transactionDate: new Date().toISOString().split("T")[0],
      commission: 0,
      approximatePayoutDate: "",
      isRecurring: false,
      recurringMonths: 0,
    });
  };

  const openEditTransaction = (tx: AffiliateTransaction) => {
    const meta = (tx.metadata || {}) as Record<string, any>;
    setEditingTransactionId(tx.id);
    setTransactionData({
      transactionDate: tx.transaction_date || new Date().toISOString().split("T")[0],
      commission: tx.amount,
      approximatePayoutDate: meta.approximate_payout_date || "",
      isRecurring: meta.is_recurring || false,
      recurringMonths: meta.recurring_months || 0,
    });
    setIsAddingTransaction(true);
  };

  // Stats
  const totalSales = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingPayouts = transactions
    .filter((t) => {
      const meta = (t.metadata || {}) as Record<string, any>;
      return meta.approximate_payout_date && new Date(meta.approximate_payout_date) > new Date();
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Parse JSON fields from program
  const affiliateLinks = useMemo(() => {
    if (!program?.affiliate_links) return [];
    const raw = program.affiliate_links;
    if (Array.isArray(raw)) return raw as string[];
    return [];
  }, [program?.affiliate_links]);

  const paymentMethods = useMemo(() => {
    if (!program?.payment_methods) return [];
    const raw = program.payment_methods;
    if (Array.isArray(raw)) return raw as string[];
    return [];
  }, [program?.payment_methods]);

  if (programLoading || !program) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container px-4 md:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <button
                onClick={() => navigate("/monetization?tab=affiliate")}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Programs
              </button>
              <h1 className="text-3xl font-bold text-foreground">
                {company?.name || "Affiliate Program"}
              </h1>
              <p className="text-muted-foreground text-lg">Affiliate Program Details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-8 py-8 space-y-8">
        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${pendingPayouts.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalSales}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Program Details</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-6">
                {program.dashboard_url && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Dashboard</Label>
                    <p>
                      <a
                        href={program.dashboard_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {program.dashboard_url}
                      </a>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Commission Rate</Label>
                    <p className="text-foreground">{program.commission_percentage}%</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Payout Frequency</Label>
                    <p className="capitalize text-foreground">{program.payout_frequency}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Next Payout</Label>
                    <p className="text-foreground">
                      {program.next_payout_date
                        ? new Date(program.next_payout_date).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Minimum Payout</Label>
                    <p className="text-foreground">${program.minimum_payout}</p>
                  </div>
                </div>

                {affiliateLinks.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Affiliate Links</Label>
                    <div className="space-y-1">
                      {affiliateLinks.map((link, i) => (
                        <a
                          key={i}
                          href={String(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-primary hover:underline"
                        >
                          {String(link)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMethods.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Payment Methods</Label>
                    <p className="text-foreground">{paymentMethods.join(", ")}</p>
                  </div>
                )}

                {program.notes && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Notes</Label>
                    <p className="text-foreground">{program.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>Track commissions and payouts</CardDescription>
                </div>
                <Button onClick={() => navigate(`/affiliate-program/${id}/add-transaction`)}>
                  Add Transaction
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Payout Date</TableHead>
                      <TableHead>Recurring</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const meta = (tx.metadata || {}) as Record<string, any>;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {tx.transaction_date
                              ? new Date(tx.transaction_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>${tx.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {meta.approximate_payout_date
                              ? new Date(meta.approximate_payout_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {meta.is_recurring
                              ? `Yes (${meta.recurring_months} months)`
                              : "No"}
                          </TableCell>
                          <TableCell>
                            {tx.status === "paid" ? (
                              <Badge variant="default" className="gap-1">
                                <Check className="h-3 w-3" /> Paid
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <X className="h-3 w-3" /> Unpaid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {tx.status !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPaid.mutateAsync(tx.id)}
                                  disabled={markAsPaid.isPending}
                                >
                                  Mark as Paid
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditTransaction(tx)}
                              >
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No transactions recorded
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransactionId ? "Edit" : "Add"} Transaction</DialogTitle>
            <DialogDescription>
              Record a commission transaction for this affiliate program
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={transactionData.transactionDate}
                onChange={(e) =>
                  setTransactionData({ ...transactionData, transactionDate: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={transactionData.commission}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    commission: parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Approximate Payout Date</Label>
              <Input
                type="date"
                value={transactionData.approximatePayoutDate}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    approximatePayoutDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={transactionData.isRecurring}
                onCheckedChange={(checked) =>
                  setTransactionData({ ...transactionData, isRecurring: checked })
                }
              />
              <Label>Recurring Transaction</Label>
            </div>
            {transactionData.isRecurring && (
              <div className="space-y-2">
                <Label>Number of Months</Label>
                <Input
                  type="number"
                  min="1"
                  value={transactionData.recurringMonths}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      recurringMonths: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createTx.isPending || updateTx.isPending}>
                {editingTransactionId ? "Update" : "Add"} Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

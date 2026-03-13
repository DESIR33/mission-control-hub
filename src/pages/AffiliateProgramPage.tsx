import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleDollarSign, CalendarIcon, BarChart3, Check, X, ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCompanies } from "@/hooks/use-companies";
import {
  useAffiliateTransactions,
  useCreateAffiliateTransaction,
  useUpdateAffiliateTransaction,
  type AffiliateTransaction,
} from "@/hooks/use-affiliate-transactions";
import { ExportRevenueDialog } from "@/components/revenue/ExportRevenueDialog";

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
    saleAmount: 0,
    commission: 0,
    commissionManuallyEdited: false,
    approximatePayoutDate: "",
    isRecurring: false,
    recurringMonths: 0,
  });

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

  const { data: companies = [] } = useCompanies();
  const company = useMemo(
    () => companies.find((c) => c.id === program?.company_id),
    [companies, program?.company_id]
  );

  const { data: allTransactions = [] } = useAffiliateTransactions();
  const transactions = useMemo(
    () => allTransactions.filter((t) => t.affiliate_program_id === id),
    [allTransactions, id]
  );

  const createTx = useCreateAffiliateTransaction();
  const updateTx = useUpdateAffiliateTransaction();

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
      sale_amount: transactionData.saleAmount,
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
      saleAmount: 0,
      commission: 0,
      commissionManuallyEdited: false,
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
      saleAmount: tx.sale_amount || 0,
      commission: tx.amount,
      commissionManuallyEdited: true,
      approximatePayoutDate: meta.approximate_payout_date || "",
      isRecurring: meta.is_recurring || false,
      recurringMonths: meta.recurring_months || 0,
    });
    setIsAddingTransaction(true);
  };

  const totalSales = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingPayouts = transactions
    .filter((t) => {
      const meta = (t.metadata || {}) as Record<string, any>;
      return meta.approximate_payout_date && new Date(meta.approximate_payout_date) > new Date();
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);

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
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => navigate("/monetization?tab=affiliate")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Monetization
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {company?.name || "Affiliate Program"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Affiliate Program Details
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</span>
            <CircleDollarSign className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Payouts</span>
            <CalendarIcon className="h-4 w-4 text-warning" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">${pendingPayouts.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sales</span>
            <BarChart3 className="h-4 w-4 text-chart-1" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{totalSales}</p>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Program Details</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="rounded-lg border border-border bg-card p-5 space-y-5">
              {program.dashboard_url && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dashboard</span>
                  <p>
                    <a
                      href={program.dashboard_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground hover:text-muted-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      {program.dashboard_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commission Rate</span>
                  <p className="text-sm font-semibold text-foreground">{program.commission_percentage}%</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payout Frequency</span>
                  <p className="text-sm font-semibold text-foreground capitalize">{program.payout_frequency}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Payout</span>
                  <p className="text-sm font-semibold text-foreground">
                    {program.next_payout_date
                      ? new Date(program.next_payout_date).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Minimum Payout</span>
                  <p className="text-sm font-semibold text-foreground font-mono">${program.minimum_payout}</p>
                </div>
              </div>

              {affiliateLinks.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Affiliate Links</span>
                    <div className="space-y-1">
                      {affiliateLinks.map((link, i) => (
                        <a
                          key={i}
                          href={String(link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-foreground hover:text-muted-foreground transition-colors"
                        >
                          {String(link)}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {paymentMethods.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Methods</span>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {paymentMethods.map((method, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {String(method)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {program.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</span>
                    <p className="text-sm text-muted-foreground">{program.notes}</p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">Transactions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Track commissions and payouts</p>
                </div>
                <div className="flex items-center gap-2">
                <ExportRevenueDialog transactions={programTransactions} />
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTransactionId(null);
                    setTransactionData({
                      transactionDate: new Date().toISOString().split("T")[0],
                      saleAmount: 0,
                      commission: 0,
                      commissionManuallyEdited: false,
                      approximatePayoutDate: "",
                      isRecurring: false,
                      recurringMonths: 0,
                    });
                    setIsAddingTransaction(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Transaction
                </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                 <TableRow>
                     <TableHead>Date</TableHead>
                     <TableHead>Sale Amount</TableHead>
                     <TableHead>Commission</TableHead>
                     <TableHead>Payout Date</TableHead>
                     <TableHead>Recurring</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const meta = (tx.metadata || {}) as Record<string, any>;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {tx.transaction_date
                            ? new Date(tx.transaction_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          ${(tx.sale_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm font-mono font-semibold">
                          ${tx.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {meta.approximate_payout_date
                            ? new Date(meta.approximate_payout_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {meta.is_recurring
                            ? `Yes (${meta.recurring_months}mo)`
                            : "No"}
                        </TableCell>
                        <TableCell>
                          {tx.status === "paid" ? (
                            <Badge variant="default" className="gap-1 text-xs">
                              <Check className="h-3 w-3" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <X className="h-3 w-3" /> Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tx.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => markAsPaid.mutateAsync(tx.id)}
                                disabled={markAsPaid.isPending}
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">
                        No transactions recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transactionData.transactionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionData.transactionDate
                      ? format(parseISO(transactionData.transactionDate), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transactionData.transactionDate ? parseISO(transactionData.transactionDate) : undefined}
                    onSelect={(d) =>
                      d && setTransactionData({ ...transactionData, transactionDate: format(d, "yyyy-MM-dd") })
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Sale Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={transactionData.saleAmount || ""}
                onChange={(e) => {
                  const saleAmt = parseFloat(e.target.value) || 0;
                  const autoCommission = program?.commission_percentage
                    ? parseFloat((saleAmt * program.commission_percentage / 100).toFixed(2))
                    : 0;
                  setTransactionData({
                    ...transactionData,
                    saleAmount: saleAmt,
                    ...(transactionData.commissionManuallyEdited ? {} : { commission: autoCommission }),
                  });
                }}
                placeholder="How much the customer paid"
              />
              {program?.commission_percentage != null && (
                <p className="text-xs text-muted-foreground">
                  Commission rate: {program.commission_percentage}%
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Commission Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={transactionData.commission || ""}
                onChange={(e) =>
                  setTransactionData({
                    ...transactionData,
                    commission: parseFloat(e.target.value) || 0,
                    commissionManuallyEdited: true,
                  })
                }
                required
              />
              {transactionData.saleAmount > 0 && transactionData.commission > 0 && (
                <p className="text-xs text-muted-foreground">
                  Effective rate: {((transactionData.commission / transactionData.saleAmount) * 100).toFixed(1)}%
                  {transactionData.commissionManuallyEdited && (
                    <button
                      type="button"
                      className="ml-2 text-primary hover:underline"
                      onClick={() => {
                        const autoCommission = program?.commission_percentage
                          ? parseFloat((transactionData.saleAmount * program.commission_percentage / 100).toFixed(2))
                          : 0;
                        setTransactionData({
                          ...transactionData,
                          commission: autoCommission,
                          commissionManuallyEdited: false,
                        });
                      }}
                    >
                      Reset to {program?.commission_percentage}%
                    </button>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Approximate Payout Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transactionData.approximatePayoutDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionData.approximatePayoutDate
                      ? format(parseISO(transactionData.approximatePayoutDate), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transactionData.approximatePayoutDate ? parseISO(transactionData.approximatePayoutDate) : undefined}
                    onSelect={(d) =>
                      setTransactionData({
                        ...transactionData,
                        approximatePayoutDate: d ? format(d, "yyyy-MM-dd") : "",
                      })
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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

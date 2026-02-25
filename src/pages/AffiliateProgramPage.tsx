import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { CircleDollarSign, Calendar, BarChart3, Check, X } from "lucide-react";
import {Badge} from "@/components/ui/badge";

interface Transaction {
  id: number;
  affiliateProgramId: number;
  transactionDate: string;
  commission: number;
  approximatePayoutDate: string;
  isRecurring: boolean;
  recurringMonths: number | null;
  status?: string;
  isPaid?: boolean;
}

interface AffiliateProgram {
  id: number;
  companyId: number;
  dashboardUrl: string;
  commissionPercentage: number;
  payoutFrequency: string;
  nextPayoutDate: string;
  affiliateLinks: string[];
  minimumPayout: number;
  paymentMethods: string[];
  notes: string;
}

interface Company {
  id: number;
  name: string;
}

export default function AffiliateProgramPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactionData, setTransactionData] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    commission: 0,
    approximatePayoutDate: '',
    isRecurring: false,
    recurringMonths: 0
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: program } = useQuery<AffiliateProgram>({
    queryKey: [`/api/affiliate-programs/${id}`],
  });

  const { data: company } = useQuery<Company>({
    queryKey: [`/api/companies/${program?.companyId}`],
    enabled: !!program?.companyId,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: [`/api/affiliate-programs/${id}/transactions`],
    enabled: !!id,
  });

  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);

  const updateTransaction = useMutation({
    mutationFn: async ({ transactionId, data }: { transactionId: number, data: Omit<Transaction, 'id'> }) => {
      const csrfResponse = await fetch('/api/csrf/token');
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/affiliate-programs/${id}/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          amount: parseFloat(data.commission.toString()),
          transactionDate: data.transactionDate,
          approximatePayoutDate: data.approximatePayoutDate || null,
          isRecurring: data.isRecurring,
          recurringMonths: data.isRecurring ? data.recurringMonths : null,
          status: data.status || 'pending'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error updating transaction:', errorText);
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/affiliate-programs/${id}/transactions`] });
      setIsAddingTransaction(false);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (data: Omit<Transaction, 'id'>) => {
      const csrfResponse = await fetch('/api/csrf/token');
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/affiliate-programs/${id}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          ...data,
          commission: parseFloat(data.commission.toString()),
          affiliateProgramId: parseInt(id!),
          recurringMonths: data.isRecurring ? data.recurringMonths : null,
          status: 'pending'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/affiliate-programs/${id}/transactions`] });
      setIsAddingTransaction(false);
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (transactionId: number) => {
      const csrfResponse = await fetch('/api/csrf/token');
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/affiliate-programs/${id}/transactions/${transactionId}/paid`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to mark as paid';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          console.error('Error parsing response:', errorText);
          errorMessage = 'Server error occurred. Please try again.';
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/affiliate-programs/${id}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/affiliate-programs/${id}`] });
      toast({
        title: "Success",
        description: "Transaction marked as paid",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const totalSales = Array.isArray(transactions) ? transactions.length : 0;
  const totalRevenue = Array.isArray(transactions) ?
    transactions.reduce((sum, t) => sum + (parseFloat(t.commission as any) || 0), 0) : 0;
  const pendingPayouts = Array.isArray(transactions) ?
    transactions
      .filter(t => t.approximatePayoutDate && new Date(t.approximatePayoutDate) > new Date())
      .reduce((sum, t) => sum + (parseFloat(t.commission as any) || 0), 0) : 0;

  if (!program || !company) {
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
      {/* Hero Section with Neumorphic Design */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="container px-4 md:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-gray-700 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-95 active:scale-90 font-medium"
                >
                  ← Back to Programs
                </button>
              </div>
              <h1 className="text-4xl font-bold text-white">{company.name}</h1>
              <p className="text-gray-400 text-lg">Affiliate Program Details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-8 py-8 space-y-8">

        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border/50 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
              <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 transition-all duration-300 group-hover:scale-110">
                <CircleDollarSign className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">${totalRevenue.toFixed(2)}</div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border/50 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Payouts</h3>
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 transition-all duration-300 group-hover:scale-110">
                <Calendar className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">${pendingPayouts.toFixed(2)}</div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border/50 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-[1.02] group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Sales</h3>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-all duration-300 group-hover:scale-110">
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">{totalSales}</div>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="bg-gray-800 p-1 rounded-2xl inline-flex gap-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.2),inset_-6px_-6px_12px_rgba(255,255,255,0.02)] border border-gray-700">
            <TabsTrigger
              value="details"
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] data-[state=active]:dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] text-gray-400 hover:text-white active:scale-95"
            >
              Program Details
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] data-[state=active]:dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] text-gray-400 hover:text-white active:scale-95"
            >
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border/50 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)]">
              <div className="space-y-6">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Dashboard</Label>
                <p>
                  <a
                    href={program.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {program.dashboardUrl}
                  </a>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Commission Rate</Label>
                  <p>{program.commissionPercentage}%</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Payout Frequency</Label>
                  <p className="capitalize">{program.payoutFrequency}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Next Payout</Label>
                  <p>{program.nextPayoutDate ? new Date(program.nextPayoutDate).toLocaleDateString() : 'Not set'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Minimum Payout</Label>
                  <p>${program.minimumPayout}</p>
                </div>
              </div>

              {program.affiliateLinks && program.affiliateLinks.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Affiliate Links</Label>
                  <div className="space-y-1">
                    {program.affiliateLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary hover:underline"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {program.paymentMethods && program.paymentMethods.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Payment Methods</Label>
                  <p>{program.paymentMethods.join(', ')}</p>
                </div>
              )}

              {program.notes && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p>{program.notes}</p>
                </div>
              )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border/50 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
                    <p className="text-muted-foreground">Track commissions and payouts</p>
                  </div>
                  <button
                    onClick={() => navigate(`/affiliate-program/${id}/add-transaction`)}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-primary/30 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-95 active:scale-90 font-medium"
                  >
                    Add Transaction
                  </button>
                </div>
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
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell>${transaction.commission}</TableCell>
                      <TableCell>{transaction.approximatePayoutDate ? new Date(transaction.approximatePayoutDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        {transaction.isRecurring ?
                          `Yes (${transaction.recurringMonths} months)` :
                          'No'
                        }
                      </TableCell>
                      <TableCell>
                        {transaction.status === 'paid' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" /> Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="w-3 h-3 mr-1" /> Unpaid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {transaction.status !== 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsPaid.mutateAsync(transaction.id)}
                            disabled={markAsPaid.isPending}
                          >
                            Mark as Paid
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/affiliate-program/${id}/edit-transaction?editId=${transaction.id}`}>
                            Edit
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                        No transactions recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>

          <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
            <DialogContent className="bg-card/95 backdrop-blur-sm border border-border/50 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Record a new commission transaction for this affiliate program
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const data = {
                  ...transactionData,
                  affiliateProgramId: parseInt(id!),
                  recurringMonths: transactionData.isRecurring ? transactionData.recurringMonths : null,
                };

                if (editingTransactionId) {
                  await updateTransaction.mutateAsync({ transactionId: editingTransactionId, data });
                } else {
                  await createTransaction.mutateAsync(data);
                }
                setEditingTransactionId(null);
              }} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionDate">Transaction Date</Label>
                    <Input
                      id="transactionDate"
                      type="date"
                      value={transactionData.transactionDate}
                      onChange={e => setTransactionData({ ...transactionData, transactionDate: e.target.value })}
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
                      value={transactionData.commission}
                      onChange={e => setTransactionData({ ...transactionData, commission: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="approximatePayoutDate">Approximate Payout Date</Label>
                    <Input
                      id="approximatePayoutDate"
                      type="date"
                      value={transactionData.approximatePayoutDate}
                      onChange={e => setTransactionData({ ...transactionData, approximatePayoutDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRecurring"
                      checked={transactionData.isRecurring}
                      onCheckedChange={checked => setTransactionData({ ...transactionData, isRecurring: checked })}
                    />
                    <Label htmlFor="isRecurring">Recurring Transaction</Label>
                  </div>

                  {transactionData.isRecurring && (
                    <div className="space-y-2">
                      <Label htmlFor="recurringMonths">Number of Months</Label>
                      <Input
                        id="recurringMonths"
                        type="number"
                        min="1"
                        value={transactionData.recurringMonths}
                        onChange={e => setTransactionData({ ...transactionData, recurringMonths: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <button
                    type="submit"
                    disabled={createTransaction.isPending}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-primary/30 transition-all duration-300 hover:shadow-[8px_8px_16px_rgba(0,0,0,0.15),-8px_-8px_16px_rgba(255,255,255,0.08)] dark:hover:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.04)] hover:scale-95 active:scale-90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTransaction.isPending ? "Adding..." : "Add Transaction"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

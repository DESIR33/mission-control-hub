import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Receipt, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RevenueWidget, type RevenueMetric } from "@/components/revenue/RevenueWidget";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Interface definitions
interface Sponsorship {
  id: number;
  companyId: number;
  value: number | string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus?: string;
  description?: string;
  companyName?: string;
}

interface ProductTransaction {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  totalAmount: number | string;
  netAmount: number | string;
  transactionDate: string;
  paymentMethod: string;
  isPaid?: boolean;
  platform?: string;
  commission?: number | string;
  approximatePayoutDate?: string;
}

interface AffiliateProgram {
  id: number;
  name: string;
  companyId: number;
  companyName?: string;
  commissionRate: number;
  commissionPercentage?: number;
  payoutFrequency?: string;
  nextPayoutDate?: string;
  totalRevenue?: number;
  status: string;
  transactions?: any[];
  [key: string]: any;
}

interface Company {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  [key: string]: any;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  type: 'digital' | 'physical';
  createdAt: string;
}

export default function MonetizationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse the tab from the URL query parameter once during initialization
  const getInitialTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'products' || tabParam === 'affiliates' || tabParam === 'sponsorships'
      ? tabParam
      : "overview";
  }, []);

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Initialize product tab based on URL parameters
  const getInitialProductTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'products' ? "transactions" : "products";
  }, []);

  const [activeProductTab, setActiveProductTab] = useState<"products" | "transactions">(getInitialProductTab);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<ProductTransaction | null>(null);
  const [metrics, setMetrics] = useState<RevenueMetric[]>([
    {
      id: "total-revenue",
      title: "Total Revenue",
      type: "amount",
      value: 0,
      period: "total",
      source: "all",
    },
    {
      id: "monthly-revenue",
      title: "Monthly Revenue",
      type: "amount",
      value: 0,
      period: "monthly",
      source: "all",
    },
    {
      id: "unpaid-revenue",
      title: "Unpaid Revenue",
      type: "amount",
      value: 0,
      period: "total",
      source: "affiliate",
    },
    {
      id: "total-transactions",
      title: "Total Transactions",
      type: "count",
      value: 0,
      period: "total",
      source: "all",
    },
  ]);

  const { data: affiliatePrograms = [] } = useQuery<AffiliateProgram[]>({
    queryKey: ["/api/affiliate-programs"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: sponsorships = [] } = useQuery<Sponsorship[]>({
    queryKey: ["/api/sponsorships"],
  });

  const { data: transactions = [] } = useQuery<ProductTransaction[]>({
    queryKey: ["/api/product-transactions"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleAddWidget = (newMetric: RevenueMetric) => {
    setMetrics(prev => [...prev, { ...newMetric, id: crypto.randomUUID() }]);
    setIsAddingWidget(false);
    toast({
      title: "Widget added",
      description: "New revenue metric widget has been added to your dashboard.",
    });
  };

  const handleUpdateWidget = (updatedMetric: RevenueMetric) => {
    setMetrics(prev => prev.map(m => m.id === updatedMetric.id ? updatedMetric : m));
  };

  const handleDeleteWidget = (id: string) => {
    setMetrics(prev => prev.filter(m => m.id !== id));
    toast({
      title: "Widget removed",
      description: "The revenue metric widget has been removed from your dashboard.",
    });
  };

  useEffect(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate total affiliate revenue (including both paid and unpaid)
    const totalAffiliateRevenue = affiliatePrograms.reduce((total: number, program) => {
      const programRevenue = program.transactions?.reduce((sum: number, transaction: any) => {
        if (!transaction) return sum;
        return sum + (Number(transaction.commission) || 0);
      }, 0) || 0;
      return total + programRevenue;
    }, 0);

    // Calculate total sponsorship revenue - only count completed and paid sponsorships
    const totalSponsorshipRevenue = sponsorships.reduce((sum: number, sponsorship) => {
      if (!sponsorship?.value || sponsorship.status !== 'completed' || sponsorship.paymentStatus !== 'paid') return sum;
      return sum + parseFloat(String(sponsorship.value));
    }, 0);

    // Calculate total product revenue
    const totalProductRevenue = transactions.reduce((sum: number, transaction) => {
      return sum + parseFloat(String(transaction.totalAmount));
    }, 0);

    // Calculate monthly revenues
    const monthlyAffiliateRevenue = affiliatePrograms.reduce((total: number, program) => {
      const programRevenue = program.transactions?.reduce((sum: number, transaction: any) => {
        if (!transaction) return sum;
        const transactionDate = transaction.approximatePayoutDate ?
          new Date(transaction.approximatePayoutDate) :
          new Date();
        if (transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth) {
          return sum + (Number(transaction.commission) || 0);
        }
        return sum;
      }, 0) || 0;
      return total + programRevenue;
    }, 0);

    const monthlySponsorshipRevenue = sponsorships.reduce((sum: number, sponsorship) => {
      if (!sponsorship?.value || !sponsorship?.endDate || sponsorship.status !== 'completed' || sponsorship.paymentStatus !== 'paid') return sum;
      const endDate = new Date(sponsorship.endDate);
      if (endDate >= firstDayOfMonth && endDate <= lastDayOfMonth) {
        return sum + parseFloat(String(sponsorship.value));
      }
      return sum;
    }, 0);

    const monthlyProductRevenue = transactions.reduce((sum: number, transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      if (transactionDate >= firstDayOfMonth && transactionDate <= lastDayOfMonth) {
        return sum + parseFloat(String(transaction.totalAmount));
      }
      return sum;
    }, 0);

    const monthlyTotalRevenue = monthlyAffiliateRevenue + monthlySponsorshipRevenue + monthlyProductRevenue;
    const totalRevenue = totalAffiliateRevenue + totalSponsorshipRevenue + totalProductRevenue;

    setMetrics(prev => prev.map(metric => {
      if (metric.id === "total-revenue") {
        return { ...metric, value: totalRevenue || 0 };
      }
      if (metric.id === "monthly-revenue") {
        return { ...metric, value: monthlyTotalRevenue || 0 };
      }
      if (metric.id === "total-transactions") {
        const totalTransactionCount = (
          affiliatePrograms.reduce((sum: number, program) => sum + (program.transactions?.length || 0), 0) +
          sponsorships.length +
          transactions.length
        );
        return { ...metric, value: totalTransactionCount };
      }
      if (metric.id === "unpaid-revenue") {
        const unpaidRevenue = affiliatePrograms.reduce((total: number, program) => {
          const unpaidTransactions = program.transactions?.filter((t: any) => t && typeof t.isPaid !== 'undefined' && !t.isPaid) || [];
          return total + unpaidTransactions.reduce((sum: number, t: any) => sum + (Number(t.commission) || 0), 0);
        }, 0);
        return { ...metric, value: unpaidRevenue || 0 };
      }
      return metric;
    }));
  }, [affiliatePrograms, sponsorships, transactions]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  const handleRowClick = (programId: number) => {
    navigate(`/affiliate-program/${programId}`);
  };

  const deleteAffiliateProgram = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/affiliate-programs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-programs"] });
      toast({
        title: "Affiliate Program deleted",
        description: "The affiliate program has been successfully deleted.",
      });
    },
  });

  const handleDeleteProgram = async (id: number) => {
    try {
      await deleteAffiliateProgram.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting program:', error);
    }
  };

  const sortedAffiliatePrograms = useMemo(() => {
    if (affiliatePrograms === null || affiliatePrograms === undefined || sortConfig === null) {
      return affiliatePrograms;
    }
    return [...affiliatePrograms].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return -1 * direction;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return 1 * direction;
      }
      return 0;
    });
  }, [affiliatePrograms, sortConfig]);

  const handleDeleteProduct = async (id: number) => {
    try {
      const csrfResponse = await fetch('/api/csrf/token', {
        credentials: 'include'
      });
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error("Failed to delete product");

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const csrfResponse = await fetch('/api/csrf/token', {
        credentials: 'include'
      });
      if (!csrfResponse.ok) throw new Error("Failed to get CSRF token");
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/product-transactions/${id}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error("Failed to delete transaction");

      queryClient.invalidateQueries({ queryKey: ["/api/product-transactions"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  // Calculate sales data for charts
  const salesData = useMemo(() => {
    const monthlySales = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transactionDate);
      const monthYear = format(date, 'MMM yyyy');

      if (!acc[monthYear]) {
        acc[monthYear] = {
          month: monthYear,
          total: 0,
          products: {} as Record<string, number>,
        };
      }

      acc[monthYear].total += Number(transaction.totalAmount);

      if (!acc[monthYear].products[transaction.productName]) {
        acc[monthYear].products[transaction.productName] = 0;
      }
      acc[monthYear].products[transaction.productName] += Number(transaction.totalAmount);

      return acc;
    }, {} as Record<string, { month: string; total: number; products: Record<string, number> }>);

    return Object.values(monthlySales);
  }, [transactions]);

  const productSalesData = useMemo(() => {
    const productTotals = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.productName]) {
        acc[transaction.productName] = {
          name: transaction.productName,
          total: 0,
          quantity: 0,
        };
      }
      acc[transaction.productName].total += Number(transaction.totalAmount);
      acc[transaction.productName].quantity += Number(transaction.quantity);
      return acc;
    }, {} as Record<string, { name: string; total: number; quantity: number }>);

    return Object.values(productTotals).sort((a, b) => b.total - a.total);
  }, [transactions]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex-shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Monetization Dashboard
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base max-w-2xl">
              Manage your revenue streams, track performance metrics, and optimize your monetization strategies across all channels
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/affiliate-program/new")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.05)] transition-all hover:scale-95"
            >
              <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
              New Program
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 md:p-8 lg:p-10 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-8 inline-flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                activeTab === "overview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("affiliate")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                activeTab === "affiliate"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
              )}
            >
              Affiliate Programs
            </button>
            <button
              onClick={() => setActiveTab("sponsorships")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                activeTab === "sponsorships"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
              )}
            >
              Sponsorships
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                activeTab === "products"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
              )}
            >
              Products
            </button>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="rounded-3xl bg-background p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Revenue Metrics</h2>
                    <p className="text-muted-foreground">Track your performance across all revenue streams</p>
                  </div>
                  <Dialog open={isAddingWidget} onOpenChange={setIsAddingWidget}>
                    <DialogTrigger asChild>
                      <button className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95 active:scale-90 border border-primary/30 font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Widget
                      </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                      <DialogHeader className="space-y-3">
                        <DialogTitle className="text-2xl font-bold">Add Revenue Widget</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Create a new widget to track your revenue metrics
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleAddWidget({
                          id: "",
                          title: formData.get("title") as string,
                          type: formData.get("type") as RevenueMetric["type"],
                          value: 0,
                          period: formData.get("period") as RevenueMetric["period"],
                          source: formData.get("source") as RevenueMetric["source"],
                        });
                      }}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="title">Widget Title</Label>
                            <Input
                              id="title"
                              name="title"
                              placeholder="e.g., Monthly Affiliate Revenue"
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="type">Display Type</Label>
                            <Select name="type" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">Currency Amount</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="count">Count</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="period">Time Period</Label>
                            <Select name="period" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="source">Revenue Source</Label>
                            <Select name="source" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="affiliate">Affiliate</SelectItem>
                                <SelectItem value="sponsorship">Sponsorship</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Add Widget</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.id} className="rounded-2xl bg-muted/30 p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                      <RevenueWidget
                        metric={metric}
                        onUpdate={handleUpdateWidget}
                        onDelete={handleDeleteWidget}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Affiliate Programs Tab */}
          <TabsContent value="affiliate">
            <div className="space-y-6">
              <div className="rounded-3xl bg-background p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Affiliate Programs</h2>
                    <p className="text-muted-foreground">
                      Manage your affiliate program relationships and track earnings across platforms
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/affiliate-program/new")}
                    className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95 active:scale-90 border border-primary/30 font-medium flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Program
                  </button>
                </div>
                <div className="overflow-auto">
                  <div className="rounded-2xl bg-muted/30 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border overflow-hidden">
                    <Table className="min-w-[650px]">
                      <TableHeader>
                        <TableRow className="border-b border-border">
                          <TableHead className="w-[200px] cursor-pointer py-4 font-semibold" onClick={() => handleSort("company")}>
                            Company {sortConfig?.key === "company" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer py-4 font-semibold" onClick={() => handleSort("commission")}>
                            <span className="hidden sm:inline">Commission</span>
                            <span className="inline sm:hidden">Comm %</span>
                            {sortConfig?.key === "commission" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer py-4 font-semibold" onClick={() => handleSort("frequency")}>
                            <span className="hidden sm:inline">Frequency</span>
                            <span className="inline sm:hidden">Freq</span>
                            {sortConfig?.key === "frequency" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer py-4 font-semibold" onClick={() => handleSort("nextPayout")}>
                            <span className="hidden sm:inline">Next Payout</span>
                            <span className="inline sm:hidden">Next Pay</span>
                            {sortConfig?.key === "nextPayout" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer py-4 font-semibold" onClick={() => handleSort("totalRevenue")}>
                            <span className="hidden sm:inline">Total Revenue</span>
                            <span className="inline sm:hidden">Revenue</span>
                            {sortConfig?.key === "totalRevenue" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="text-right py-4 font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAffiliatePrograms.map((program) => {
                          const company = companies.find((c) => c.id === program.companyId);
                          return (
                            <TableRow
                              key={program.id}
                              className="cursor-pointer border-b border-border/50 hover:bg-muted/30 transition-colors py-4"
                              onClick={() => handleRowClick(program.id)}
                            >
                              <TableCell>{company?.name || "Unknown Company"}</TableCell>
                              <TableCell>{program.commissionPercentage}%</TableCell>
                              <TableCell>{program.payoutFrequency}</TableCell>
                              <TableCell>
                                {program.nextPayoutDate
                                  ? format(new Date(program.nextPayoutDate), "MMM d, yyyy")
                                  : "Not set"}
                              </TableCell>
                              <TableCell>
                                ${program.totalRevenue?.toLocaleString() || "0"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/affiliate-program/${program.id}/edit`)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Affiliate Program</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this affiliate program and all its associated data.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteProgram(program.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Sponsorships Tab */}
          <TabsContent value="sponsorships">
            <div className="space-y-6">
              <div className="rounded-3xl bg-background p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Sponsorships</h2>
                    <p className="text-muted-foreground">
                      Manage your sponsorship deals and track payment performance
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/monetization/new-sponsorship")}
                    className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95 active:scale-90 border border-primary/30 font-medium flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Sponsorship
                  </button>
                </div>
                <div className="overflow-auto">
                  <div className="rounded-2xl bg-muted/30 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border overflow-hidden">
                    <Table className="min-w-[650px]">
                      <TableHeader>
                        <TableRow className="border-b border-border">
                          <TableHead className="py-4 font-semibold">Brand</TableHead>
                          <TableHead className="py-4 font-semibold">Value</TableHead>
                          <TableHead className="py-4 font-semibold">
                            <span className="hidden sm:inline">Start Date</span>
                            <span className="inline sm:hidden">Start</span>
                          </TableHead>
                          <TableHead className="py-4 font-semibold">
                            <span className="hidden sm:inline">End Date</span>
                            <span className="inline sm:hidden">End</span>
                          </TableHead>
                          <TableHead className="py-4 font-semibold">Status</TableHead>
                          <TableHead className="text-right py-4 font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sponsorships.map((sponsorship) => {
                          const company = companies.find((c) => c.id === sponsorship.companyId);
                          return (
                            <TableRow key={sponsorship.id} className="cursor-pointer border-b border-border/50 hover:bg-muted/30 transition-colors py-4">
                              <TableCell>{company?.name || "Unknown Company"}</TableCell>
                              <TableCell>${parseFloat(String(sponsorship.value)).toLocaleString()}</TableCell>
                              <TableCell>{format(new Date(sponsorship.startDate), "MMM d, yyyy")}</TableCell>
                              <TableCell>{format(new Date(sponsorship.endDate), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {new Date(sponsorship.endDate) > new Date() ? (
                                  <Badge variant="default" className="bg-green-500">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Completed</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/monetization/edit-sponsorship/${sponsorship.id}`);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="space-y-6">
              <div className="rounded-3xl bg-background p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Product Management</h2>
                    <p className="text-muted-foreground">
                      Manage your digital products and track sales performance
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setIsAddingProduct(true)}
                      className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95 active:scale-90 border border-primary/30 font-medium flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
                    </button>
                    <button
                      onClick={() => navigate("/add-transaction")}
                      className="px-6 py-3 rounded-2xl bg-background text-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95 active:scale-90 border border-border font-medium flex items-center gap-2"
                    >
                      <Receipt className="h-4 w-4" />
                      Add Transaction
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                  <div className="flex gap-3 mb-6 p-2 rounded-3xl bg-background shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] border border-border">
                    <button
                      onClick={() => setActiveProductTab("products")}
                      className={cn(
                        "px-6 py-3 rounded-2xl font-medium transition-all duration-300 border flex-1",
                        activeProductTab === "products"
                          ? "bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border-primary/30 scale-95"
                          : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95"
                      )}
                    >
                      Products
                    </button>
                    <button
                      onClick={() => setActiveProductTab("transactions")}
                      className={cn(
                        "px-6 py-3 rounded-2xl font-medium transition-all duration-300 border flex-1",
                        activeProductTab === "transactions"
                          ? "bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border-primary/30 scale-95"
                          : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent hover:shadow-[2px_2px_4px_rgba(0,0,0,0.05),-2px_-2px_4px_rgba(255,255,255,0.03)] dark:hover:shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.01)] hover:scale-95"
                      )}
                    >
                      Transactions
                    </button>
                  </div>

                  <div>
                    {activeProductTab === "products" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="w-full rounded-2xl bg-background p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold">Sales by Product</h3>
                            </div>
                            <div className="h-[150px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={productSalesData}>
                                  <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                  <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                                    stroke="hsl(var(--muted-foreground))"
                                  />
                                  <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                    stroke="hsl(var(--muted-foreground))"
                                  />
                                  <Tooltip
                                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']}
                                    contentStyle={{
                                      background: 'hsl(var(--background))',
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fill="url(#colorTotal)"
                                    dot={false}
                                    activeDot={{
                                      r: 4,
                                      stroke: "hsl(var(--primary))",
                                      strokeWidth: 2,
                                      fill: "hsl(var(--background))"
                                    }}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="w-full rounded-2xl bg-background p-6 shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold">Monthly Sales Trend</h3>
                            </div>
                            <div className="h-[150px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData}>
                                  <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                  <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                    stroke="hsl(var(--muted-foreground))"
                                  />
                                  <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={12}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                    stroke="hsl(var(--muted-foreground))"
                                  />
                                  <Tooltip
                                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                                    contentStyle={{
                                      background: 'hsl(var(--background))',
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fill="url(#colorRevenue)"
                                    dot={false}
                                    activeDot={{
                                      r: 4,
                                      stroke: "hsl(var(--primary))",
                                      strokeWidth: 2,
                                      fill: "hsl(var(--background))"
                                    }}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-auto">
                          <div className="rounded-2xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border overflow-hidden">
                            <Table className="min-w-[650px]">
                              <TableHeader>
                                <TableRow className="border-b border-border">
                                  <TableHead className="py-4 font-semibold">Name</TableHead>
                                  <TableHead className="hidden md:table-cell py-4 font-semibold">Description</TableHead>
                                  <TableHead className="py-4 font-semibold">Price</TableHead>
                                  <TableHead className="py-4 font-semibold">Type</TableHead>
                                  <TableHead className="py-4 font-semibold">
                                    <span className="hidden sm:inline">Created</span>
                                    <span className="inline sm:hidden">Date</span>
                                  </TableHead>
                                  <TableHead className="text-right py-4 font-semibold">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {products.map((product) => (
                                  <TableRow
                                    key={product.id}
                                    className="cursor-pointer border-b border-border/50 hover:bg-muted/30 transition-colors py-4"
                                    onClick={() => navigate(`/products/${product.id}`)}
                                  >
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell className="hidden md:table-cell">{product.description}</TableCell>
                                    <TableCell>${product.price.toLocaleString()}</TableCell>
                                    <TableCell>{product.type}</TableCell>
                                    <TableCell>{format(new Date(product.createdAt), "MMM d, yyyy")}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingProduct(product);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete this product. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeProductTab === "transactions" && (
                      <div className="space-y-6">
                        <div className="overflow-auto">
                          <div className="rounded-2xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border overflow-hidden">
                            <Table className="min-w-[800px]">
                              <TableHeader>
                                <TableRow className="border-b border-border">
                                  <TableHead className="py-4 font-semibold">Date</TableHead>
                                  <TableHead className="py-4 font-semibold">Product</TableHead>
                                  <TableHead className="py-4 font-semibold">Platform</TableHead>
                                  <TableHead className="py-4 font-semibold">Qty</TableHead>
                                  <TableHead className="py-4 font-semibold">
                                    <span className="hidden sm:inline">Total Amount</span>
                                    <span className="inline sm:hidden">Total</span>
                                  </TableHead>
                                  <TableHead className="py-4 font-semibold">
                                    <span className="hidden sm:inline">Commission</span>
                                    <span className="inline sm:hidden">Comm</span>
                                  </TableHead>
                                  <TableHead className="py-4 font-semibold">
                                    <span className="hidden sm:inline">Net Amount</span>
                                    <span className="inline sm:hidden">Net</span>
                                  </TableHead>
                                  <TableHead className="text-right py-4 font-semibold">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transactions.map((transaction) => (
                                  <TableRow
                                    key={transaction.id}
                                    className="border-b border-border/50 hover:bg-muted/30 transition-colors py-4 cursor-pointer"
                                    onClick={() => setEditingTransaction(transaction)}
                                  >
                                    <TableCell>{format(new Date(transaction.transactionDate), "MMM d, yyyy")}</TableCell>
                                    <TableCell>{transaction.productName}</TableCell>
                                    <TableCell>{transaction.platform}</TableCell>
                                    <TableCell>{transaction.quantity}</TableCell>
                                    <TableCell>${parseFloat(String(transaction.totalAmount)).toLocaleString()}</TableCell>
                                    <TableCell>${parseFloat(String(transaction.commission)).toLocaleString()}</TableCell>
                                    <TableCell>${parseFloat(String(transaction.netAmount)).toLocaleString()}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTransaction(transaction);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This will permanently delete this transaction. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                                Delete
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Product Dialog */}
        <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold">Add New Product</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a new product to your catalog to track sales and performance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const productData = {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                price: parseFloat(formData.get("price") as string),
                type: formData.get("type") as "digital" | "physical",
              };
              fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData),
              }).then((response) => {
                if (!response.ok) throw new Error("Failed to create product");
                return response.json();
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                setIsAddingProduct(false);
                toast({
                  title: "Success",
                  description: "Product created successfully",
                });
              }).catch(() => {
                toast({
                  title: "Error",
                  description: "Failed to create product",
                  variant: "destructive",
                });
              });
            }} className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter product description"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter price"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Product Type</Label>
                  <Select name="type" required defaultValue="digital">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[1001]">
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="physical">Physical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Transaction Dialog */}
        <Dialog open={!!editingTransaction} onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold">Edit Transaction</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Update transaction details and financial information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const transactionData = {
                transactionDate: formData.get('transactionDate'),
                productName: formData.get('productName'),
                platform: formData.get('platform'),
                quantity: parseInt(formData.get('quantity') as string),
                totalAmount: parseFloat(formData.get('totalAmount') as string),
                commission: parseFloat(formData.get('commission') as string),
                netAmount: parseFloat(formData.get('totalAmount') as string) - parseFloat(formData.get('commission') as string),
              };

              try {
                if (!editingTransaction) return;
                const response = await fetch(`/api/product-transactions/${editingTransaction.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(transactionData),
                });

                if (!response.ok) throw new Error('Failed to update transaction');

                queryClient.invalidateQueries({ queryKey: ["/api/product-transactions"] });
                toast({
                  title: "Success",
                  description: "Transaction updated successfully",
                });
                setEditingTransaction(null);
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to update transaction",
                  variant: "destructive",
                });
              }
            }} className="space-y-4">
              <div className="space-y-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="transactionDate">Transaction Date</Label>
                  <Input
                    id="transactionDate"
                    name="transactionDate"
                    type="datetime-local"
                    defaultValue={editingTransaction?.transactionDate}
                    required
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="productName">Product</Label>
                  <Select name="productName" defaultValue={editingTransaction?.productName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="platform">Platform</Label>
                  <Input
                    id="platform"
                    name="platform"
                    defaultValue={editingTransaction?.platform}
                    required
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue={editingTransaction?.quantity}
                    required
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    type="number"
                    step="0.01"
                    defaultValue={editingTransaction?.totalAmount}
                    required
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="commission">Commission</Label>
                  <Input
                    id="commission"
                    name="commission"
                    type="number"
                    step="0.01"
                    defaultValue={editingTransaction?.commission}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Transaction</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

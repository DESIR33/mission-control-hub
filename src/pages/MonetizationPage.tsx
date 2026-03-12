import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import { Plus, Trash2, Pencil, Receipt, ArrowUpDown, Film, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RevenueWidget, type RevenueMetric } from "@/components/revenue/RevenueWidget";
import "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, lineDefaults } from
"@/lib/chart-theme";
import { supabase } from "@/integrations/supabase/client";
import { useContentRevenue } from "@/hooks/use-content-revenue";
import { RateCardCalculator } from "@/components/crm/RateCardCalculator";
import { RevenueOverview } from "@/components/monetization/RevenueOverview";
import { RevenueGoalTracker } from "@/components/monetization/RevenueGoalTracker";
import { AdSenseTab } from "@/components/monetization/AdSenseTab";
import { YearlyIncomeTracker } from "@/components/monetization/YearlyIncomeTracker";
import { useCompanies } from "@/hooks/use-companies";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAffiliateTransactions } from "@/hooks/use-affiliate-transactions";

function TopEarningVideos() {
  const { data: revSummary } = useContentRevenue();
  const topVideos = useMemo(() => {
    if (!revSummary?.links) return [];
    return [...revSummary.links].
    filter((l) => l.totalRevenue > 0).
    sort((a, b) => b.totalRevenue - a.totalRevenue).
    slice(0, 10).
    map((l) => ({ id: l.videoQueueId, title: l.videoTitle, revenue: l.totalRevenue }));
  }, [revSummary]);

  if (topVideos.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-5">
      
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold text-card-foreground">Top Earning Videos</h3>
      </div>
      <div className="space-y-2">
        {topVideos.map((video, i) =>
        <div key={video.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <span className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-muted text-muted-foreground" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-secondary text-muted-foreground"
          )}>
              {i + 1}
            </span>
            <Film className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">{video.title}</span>
            <span className="text-sm font-mono font-semibold text-success shrink-0">
              ${video.revenue.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </motion.div>);

}

// Interface definitions
interface Sponsorship {
  id: string;
  companyId: string | null;
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
  id: string;
  company_id: string | null;
  commission_percentage: number;
  payout_frequency: string;
  next_payout_date: string | null;
  dashboard_url: string | null;
  minimum_payout: number;
  notes: string | null;
  created_at: string;
  [key: string]: any;
}

interface Company {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
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
  const { tab: urlTab } = useParams<{tab: string;}>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const VALID_TABS = new Set(["overview", "analytics", "affiliate", "sponsorships", "products", "rate-card", "adsense", "income-tracker"]);
  const activeTab = urlTab && VALID_TABS.has(urlTab) ? urlTab : "overview";

  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string;direction: 'asc' | 'desc';} | null>(null);

  // Initialize product tab based on URL parameters
  const getInitialProductTab = useMemo(() => {
    return urlTab === 'products' ? "transactions" : "products";
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
    source: "all"
  },
  {
    id: "monthly-revenue",
    title: "Monthly Revenue",
    type: "amount",
    value: 0,
    period: "monthly",
    source: "all"
  },
  {
    id: "unpaid-revenue",
    title: "Unpaid Revenue",
    type: "amount",
    value: 0,
    period: "total",
    source: "affiliate"
  },
  {
    id: "total-transactions",
    title: "Total Transactions",
    type: "count",
    value: 0,
    period: "total",
    source: "all"
  }]
  );

  const { workspaceId } = useWorkspace();

  const { data: affiliatePrograms = [] } = useQuery<AffiliateProgram[]>({
    queryKey: ["affiliate-programs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase.
      from("affiliate_programs").
      select("*").
      eq("workspace_id", workspaceId).
      order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AffiliateProgram[];
    },
    enabled: !!workspaceId
  });

  const { data: companies = [] } = useCompanies();
  const { data: allAffiliateTransactions = [] } = useAffiliateTransactions();

  // Build a map of affiliate_program_id -> total revenue (sum of amount/commission)
  const affiliateRevenueByProgram = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allAffiliateTransactions) {
      const programId = tx.affiliate_program_id;
      if (!programId) continue;
      map.set(programId, (map.get(programId) || 0) + (tx.amount || 0));
    }
    return map;
  }, [allAffiliateTransactions]);

  const { data: sponsorships = [] } = useQuery<Sponsorship[]>({
    queryKey: ["sponsorships", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase.
      from("deals").
      select("*, company:companies(name)").
      eq("workspace_id", workspaceId).
      is("deleted_at", null).
      order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((deal: any) => {
        // Parse notes to extract metadata stored by NewSponsorshipPage
        const notes = deal.notes || "";
        const paymentStatusMatch = notes.match(/Payment Status:\s*(\w+)/);
        const startDateMatch = notes.match(/Start Date:\s*(.+)/);
        let startDate = deal.created_at;
        if (startDateMatch) {
          try {
            const parsed = new Date(startDateMatch[1].replace(/(st|nd|rd|th),/, ","));
            if (!isNaN(parsed.getTime())) startDate = parsed.toISOString();
          } catch {}
        }
        return {
          id: deal.id,
          companyId: deal.company_id,
          value: deal.value ?? 0,
          startDate,
          endDate: deal.expected_close_date || deal.created_at,
          status: deal.stage === "closed_won" ? "completed" : deal.stage,
          paymentStatus: paymentStatusMatch ? paymentStatusMatch[1] : "pending",
          description: deal.title,
          companyName: deal.company?.name || null
        } as Sponsorship;
      });
    },
    enabled: !!workspaceId
  });

  const { data: transactions = [] } = useQuery<ProductTransaction[]>({
    queryKey: ["/api/product-transactions"]
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  const handleAddWidget = (newMetric: RevenueMetric) => {
    setMetrics((prev) => [...prev, { ...newMetric, id: crypto.randomUUID() }]);
    setIsAddingWidget(false);
    toast({
      title: "Widget added",
      description: "New revenue metric widget has been added to your dashboard."
    });
  };

  const handleUpdateWidget = (updatedMetric: RevenueMetric) => {
    setMetrics((prev) => prev.map((m) => m.id === updatedMetric.id ? updatedMetric : m));
  };

  const handleDeleteWidget = (id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    toast({
      title: "Widget removed",
      description: "The revenue metric widget has been removed from your dashboard."
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

    setMetrics((prev) => prev.map((metric) => {
      if (metric.id === "total-revenue") {
        return { ...metric, value: totalRevenue || 0 };
      }
      if (metric.id === "monthly-revenue") {
        return { ...metric, value: monthlyTotalRevenue || 0 };
      }
      if (metric.id === "total-transactions") {
        const totalTransactionCount =
        affiliatePrograms.reduce((sum: number, program) => sum + (program.transactions?.length || 0), 0) +
        sponsorships.length +
        transactions.length;

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
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  const handleRowClick = (programId: string) => {
    navigate(`/affiliate-program/${programId}`);
  };

  const deleteAffiliateProgram = useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.
      from("affiliate_programs").
      delete().
      eq("id", id).
      eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-programs", workspaceId] });
      toast({
        title: "Affiliate Program deleted",
        description: "The affiliate program has been successfully deleted."
      });
    }
  });

  const handleDeleteProgram = async (id: string) => {
    try {
      await deleteAffiliateProgram.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting program:', error);
    }
  };
  const deleteSponsorship = useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.
      from("deals").
      update({ deleted_at: new Date().toISOString() }).
      eq("id", id).
      eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({ title: "Sponsorship deleted", description: "The sponsorship has been successfully deleted." });
    }
  });

  const handleDeleteSponsorship = async (id: string) => {
    try {
      await deleteSponsorship.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting sponsorship:', error);
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
        credentials: 'include'
      });

      if (!response.ok) throw new Error("Failed to delete product");

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
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
        credentials: 'include'
      });

      if (!response.ok) throw new Error("Failed to delete transaction");

      queryClient.invalidateQueries({ queryKey: ["/api/product-transactions"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive"
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
          products: {} as Record<string, number>
        };
      }

      acc[monthYear].total += Number(transaction.totalAmount);

      if (!acc[monthYear].products[transaction.productName]) {
        acc[monthYear].products[transaction.productName] = 0;
      }
      acc[monthYear].products[transaction.productName] += Number(transaction.totalAmount);

      return acc;
    }, {} as Record<string, {month: string;total: number;products: Record<string, number>;}>);

    return Object.values(monthlySales);
  }, [transactions]);

  const productSalesData = useMemo(() => {
    const productTotals = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.productName]) {
        acc[transaction.productName] = {
          name: transaction.productName,
          total: 0,
          quantity: 0
        };
      }
      acc[transaction.productName].total += Number(transaction.totalAmount);
      acc[transaction.productName].quantity += Number(transaction.quantity);
      return acc;
    }, {} as Record<string, {name: string;total: number;quantity: number;}>);

    return Object.values(productTotals).sort((a, b) => b.total - a.total);
  }, [transactions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue streams, performance metrics, and growth strategies
          </p>
        </div>
        <Button
          onClick={() => navigate("/affiliate-program/new")}
          size="sm">
          
          <Plus className="mr-2 h-4 w-4" />
          New Program
        </Button>
      </motion.div>


      <Tabs value={activeTab} onValueChange={(v) => navigate(`/revenue/${v}`)}>
        <div className="flex overflow-x-auto scrollbar-hide gap-1 rounded-lg border border-border bg-secondary p-1">
          <button
            onClick={() => navigate("/revenue/overview")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "overview" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            
            Overview
          </button>
          <button
            onClick={() => navigate("/revenue/affiliate")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "affiliate" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            
            Affiliate Programs
          </button>
          <button
            onClick={() => navigate("/revenue/sponsorships")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "sponsorships" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            
            Sponsorships
          </button>
          <button
            onClick={() => navigate("/revenue/products")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "products" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            
            Products
          </button>
          <button
            onClick={() => navigate("/revenue/adsense")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "adsense" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            
            AdSense
          </button>
          <button
            onClick={() => navigate("/revenue/income-tracker")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "income-tracker" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            Yearly Income
          </button>
          <button
            onClick={() => navigate("/revenue/rate-card")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "rate-card" ?
              "bg-card text-card-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground"
            )}>
            
            Rate Card
          </button>
        </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-5">
              {/* Revenue Overview */}
              <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}>
              
                <RevenueOverview />
              </motion.div>
              {/* Revenue Goal Tracker */}
              <RevenueGoalTracker />
              








































































































            

              {/* Top Earning Videos */}
              <TopEarningVideos />
            </div>
          </TabsContent>

          {/* Yearly Income Tracker Tab */}
          <TabsContent value="income-tracker">
            <YearlyIncomeTracker />
          </TabsContent>


          <TabsContent value="affiliate">
            <div className="space-y-5">
              <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border bg-card p-5">
              
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Affiliate Programs
                  </h3>
                  <Button
                  onClick={() => navigate("/affiliate-program/new")}
                  size="sm">
                  
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Program
                  </Button>
                </div>
                <div className="overflow-auto rounded-md border border-border">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead className="w-[200px] cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wider" onClick={() => handleSort("company")}>
                          Company {sortConfig?.key === "company" && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                        </TableHead>
                        <TableHead className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wider" onClick={() => handleSort("commission")}>
                          Commission {sortConfig?.key === "commission" && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                        </TableHead>
                        <TableHead className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wider" onClick={() => handleSort("frequency")}>
                          Frequency {sortConfig?.key === "frequency" && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                        </TableHead>
                        <TableHead className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wider" onClick={() => handleSort("nextPayout")}>
                          Next Payout {sortConfig?.key === "nextPayout" && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                        </TableHead>
                        <TableHead className="cursor-pointer text-xs font-medium text-muted-foreground uppercase tracking-wider" onClick={() => handleSort("totalRevenue")}>
                          Revenue {sortConfig?.key === "totalRevenue" && <ArrowUpDown className="ml-1 h-3 w-3 inline" />}
                        </TableHead>
                        <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAffiliatePrograms.map((program) => {
                      const company = companies.find((c) => c.id === program.company_id);
                      return (
                        <TableRow
                          key={program.id}
                          className="cursor-pointer hover:bg-secondary transition-colors"
                          onClick={() => handleRowClick(program.id)}>
                          
                            <TableCell className="text-sm text-card-foreground">{company?.name || "Unknown Company"}</TableCell>
                            <TableCell className="text-sm font-mono text-card-foreground">{program.commission_percentage}%</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{program.payout_frequency}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {program.next_payout_date ?
                            format(new Date(program.next_payout_date), "MMM d, yyyy") :
                            "Not set"}
                            </TableCell>
                            <TableCell className="text-sm font-mono text-card-foreground">
                              {(() => {
                              const rev = affiliateRevenueByProgram.get(program.id) || 0;
                              return rev > 0 ? `$${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";
                            })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label="Edit program"
                                onClick={() => navigate(`/affiliate-program/${program.id}/edit`)}>
                                
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete program">
                                      <Trash2 className="h-3.5 w-3.5" />
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
                          </TableRow>);

                    })}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Sponsorships Tab */}
          <TabsContent value="sponsorships">
            <div className="space-y-5">
              <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border bg-card p-5">
              
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Sponsorships
                  </h3>
                  <Button
                  onClick={() => navigate("/sponsorship/new")}
                  size="sm">
                  
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Sponsorship
                  </Button>
                </div>
                <div className="overflow-auto rounded-md border border-border">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sponsorships.map((sponsorship) => {
                      const companyName = sponsorship.companyName || companies.find((c) => String(c.id) === String(sponsorship.companyId))?.name;
                      return (
                        <TableRow key={sponsorship.id} className="cursor-pointer hover:bg-secondary transition-colors">
                            <TableCell className="text-sm text-card-foreground">{companyName || "Unknown Company"}</TableCell>
                            <TableCell className="text-sm font-mono text-card-foreground">${parseFloat(String(sponsorship.value)).toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(sponsorship.startDate), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(sponsorship.endDate), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-mono capitalize ${
                                sponsorship.status === "closed_won" || sponsorship.status === "completed"
                                  ? "text-green-500"
                                  : sponsorship.status === "closed_lost"
                                    ? "text-destructive"
                                    : "text-amber-500"
                              }`}>
                                {sponsorship.status.replace(/_/g, " ")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label="Edit sponsorship"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/sponsorship/${sponsorship.id}/edit`);
                                }}>
                                
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    aria-label="Delete sponsorship"
                                    onClick={(e) => e.stopPropagation()}>
                                    
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Sponsorship</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this sponsorship? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteSponsorship(sponsorship.id)}>
                                      
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>);

                    })}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="space-y-5">
              <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border bg-card p-5">
              
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Product Management
                  </h3>
                  <div className="flex gap-2">
                    <Button
                    onClick={() => setIsAddingProduct(true)}
                    size="sm">
                    
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Product
                    </Button>
                    <Button
                    variant="outline"
                    onClick={() => navigate("/add-transaction?from=revenue")}
                    size="sm">
                    
                      <Receipt className="mr-1 h-3.5 w-3.5" />
                      Add Transaction
                    </Button>
                  </div>
                </div>

                <div className="inline-flex gap-1 rounded-lg border border-border bg-secondary p-1 mb-4">
                  <button
                  onClick={() => setActiveProductTab("products")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeProductTab === "products" ?
                    "bg-card text-card-foreground shadow-sm" :
                    "text-muted-foreground hover:text-foreground"
                  )}>
                  
                    Products
                  </button>
                  <button
                  onClick={() => setActiveProductTab("transactions")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeProductTab === "transactions" ?
                    "bg-card text-card-foreground shadow-sm" :
                    "text-muted-foreground hover:text-foreground"
                  )}>
                  
                    Transactions
                  </button>
                </div>

                {activeProductTab === "products" &&
              <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Sales by Product</p>
                        <div className="h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={productSalesData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                              <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid {...cartesianGridDefaults} />
                              <XAxis
                            {...xAxisDefaults}
                            dataKey="name"
                            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value} />
                          
                              <YAxis
                            {...yAxisDefaults}
                            tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          
                              <Tooltip
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']}
                            contentStyle={chartTooltipStyle} />
                          
                              <Area
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            fill="url(#colorTotal)"
                            {...lineDefaults} />
                          
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Monthly Sales Trend</p>
                        <div className="h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                              <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid {...cartesianGridDefaults} />
                              <XAxis
                            {...xAxisDefaults}
                            dataKey="month" />
                          
                              <YAxis
                            {...yAxisDefaults}
                            tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          
                              <Tooltip
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                            contentStyle={chartTooltipStyle} />
                          
                              <Area
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            fill="url(#colorRevenue)"
                            {...lineDefaults} />
                          
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-auto rounded-md border border-border">
                      <Table className="min-w-[650px]">
                        <TableHeader>
                          <TableRow className="border-b border-border">
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</TableHead>
                            <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</TableHead>
                            <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) =>
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => navigate(`/products/${product.id}`)}>
                        
                              <TableCell className="text-sm text-card-foreground">{product.name}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{product.description}</TableCell>
                              <TableCell className="text-sm font-mono text-card-foreground">${product.price.toLocaleString()}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{product.type}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{format(new Date(product.createdAt), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Edit product"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(product);
                              }}>
                              
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Delete product"
                                  onClick={(e) => e.stopPropagation()}>
                                  
                                        <Trash2 className="h-3.5 w-3.5" />
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
                      )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
              }

                {activeProductTab === "transactions" &&
              <div className="space-y-5">
                    <div className="overflow-auto rounded-md border border-border">
                      <Table className="min-w-[800px]">
                        <TableHeader>
                          <TableRow className="border-b border-border">
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commission</TableHead>
                            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net</TableHead>
                            <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) =>
                      <TableRow
                        key={transaction.id}
                        className="hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => setEditingTransaction(transaction)}>
                        
                              <TableCell className="text-sm text-muted-foreground">{format(new Date(transaction.transactionDate), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-sm text-card-foreground">{transaction.productName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{transaction.platform}</TableCell>
                              <TableCell className="text-sm font-mono text-card-foreground">{transaction.quantity}</TableCell>
                              <TableCell className="text-sm font-mono text-card-foreground">${parseFloat(String(transaction.totalAmount)).toLocaleString()}</TableCell>
                              <TableCell className="text-sm font-mono text-muted-foreground">${parseFloat(String(transaction.commission)).toLocaleString()}</TableCell>
                              <TableCell className="text-sm font-mono text-card-foreground">${parseFloat(String(transaction.netAmount)).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Edit transaction"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTransaction(transaction);
                              }}>
                              
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  aria-label="Delete transaction"
                                  onClick={(e) => e.stopPropagation()}>
                                  
                                        <Trash2 className="h-3.5 w-3.5" />
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
                      )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
              }
              </motion.div>
            </div>
          </TabsContent>

          {/* AdSense Tab */}
          <TabsContent value="adsense">
            <AdSenseTab />
          </TabsContent>

          {/* Rate Card Tab */}
          <TabsContent value="rate-card">
            <div className="space-y-5">
              <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}>
              
                <RateCardCalculator />
              </motion.div>
            </div>
          </TabsContent>

        {/* Add Product Dialog */}
        <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your catalog
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const productData = {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                price: parseFloat(formData.get("price") as string),
                type: formData.get("type") as "digital" | "physical"
              };
              fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData)
              }).then((response) => {
                if (!response.ok) throw new Error("Failed to create product");
                return response.json();
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                setIsAddingProduct(false);
                toast({
                  title: "Success",
                  description: "Product created successfully"
                });
              }).catch(() => {
                toast({
                  title: "Error",
                  description: "Failed to create product",
                  variant: "destructive"
                });
              });
            }} className="space-y-5">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter product name"
                    required />
                  
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter product description"
                    required />
                  
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
                    required />
                  
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update transaction details
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
                netAmount: parseFloat(formData.get('totalAmount') as string) - parseFloat(formData.get('commission') as string)
              };

              try {
                if (!editingTransaction) return;
                const response = await fetch(`/api/product-transactions/${editingTransaction.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(transactionData)
                });

                if (!response.ok) throw new Error('Failed to update transaction');

                queryClient.invalidateQueries({ queryKey: ["/api/product-transactions"] });
                toast({
                  title: "Success",
                  description: "Transaction updated successfully"
                });
                setEditingTransaction(null);
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to update transaction",
                  variant: "destructive"
                });
              }
            }} className="space-y-5">
              <div className="space-y-5">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="transactionDate">Transaction Date</Label>
                  <Input
                    id="transactionDate"
                    name="transactionDate"
                    type="datetime-local"
                    defaultValue={editingTransaction?.transactionDate}
                    required />
                  
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="productName">Product</Label>
                  <Select name="productName" defaultValue={editingTransaction?.productName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) =>
                      <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="platform">Platform</Label>
                  <Input
                    id="platform"
                    name="platform"
                    defaultValue={editingTransaction?.platform}
                    required />
                  
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue={editingTransaction?.quantity}
                    required />
                  
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    type="number"
                    step="0.01"
                    defaultValue={editingTransaction?.totalAmount}
                    required />
                  
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="commission">Commission</Label>
                  <Input
                    id="commission"
                    name="commission"
                    type="number"
                    step="0.01"
                    defaultValue={editingTransaction?.commission}
                    required />
                  
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Transaction</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>);

}
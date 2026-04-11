import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Package, TrendingUp, DollarSign, ShoppingCart, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, lineDefaults } from "@/lib/chart-theme";
import { useProducts } from "@/hooks/use-products";
import { useCompanies } from "@/hooks/use-companies";
import { safeFormat } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products, transactions, updateProduct: updateProductMutation } = useProducts();
  const { data: companies = [] } = useCompanies();
  const [isEditing, setIsEditing] = useState(false);

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  const productTransactions = useMemo(
    () => transactions.filter((t) => t.productName === product?.name),
    [transactions, product]
  );

  const stats = useMemo(() => {
    if (!productTransactions.length) return { totalRevenue: 0, totalNet: 0, totalCommission: 0, totalSold: 0, avgPrice: 0, monthlyData: [] };
    const totalRevenue = productTransactions.reduce((s, t) => s + Number(t.totalAmount), 0);
    const totalNet = productTransactions.reduce((s, t) => s + Number(t.netAmount), 0);
    const totalCommission = productTransactions.reduce((s, t) => s + Number(t.commission), 0);
    const totalSold = productTransactions.reduce((s, t) => s + t.quantity, 0);
    const avgPrice = totalSold > 0 ? totalRevenue / totalSold : 0;

    const monthlyMap: Record<string, { month: string; revenue: number; net: number; units: number }> = {};
    for (const t of productTransactions) {
      const key = safeFormat(t.transactionDate, "yyyy-MM");
      const label = safeFormat(t.transactionDate, "MMM yyyy");
      if (!monthlyMap[key]) monthlyMap[key] = { month: label, revenue: 0, net: 0, units: 0 };
      monthlyMap[key].revenue += Number(t.totalAmount);
      monthlyMap[key].net += Number(t.netAmount);
      monthlyMap[key].units += t.quantity;
    }
    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    return { totalRevenue, totalNet, totalCommission, totalSold, avgPrice, monthlyData };
  }, [productTransactions]);

  const linkedCompany = useMemo(
    () => companies.find((c: any) => c.id === product?.companyId),
    [companies, product]
  );

  if (!product) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Product not found.{" "}
        <Button variant="link" onClick={() => navigate("/revenue/products")}>
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/revenue/products")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs capitalize">{product.category}</Badge>
                {product.marketplace && (
                  <span className="text-xs text-muted-foreground">{product.marketplace}</span>
                )}
                {linkedCompany && (
                  <span className="text-xs text-muted-foreground">• {(linkedCompany as any).name}</span>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit Product
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        {[
          { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-success" },
          { label: "Net Earnings", value: `$${stats.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-primary" },
          { label: "Commission Paid", value: `$${stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: BarChart3, color: "text-warning" },
          { label: "Units Sold", value: stats.totalSold.toLocaleString(), icon: ShoppingCart, color: "text-accent-foreground" },
          { label: "Avg Price", value: `$${stats.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-muted-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className="text-xl font-bold font-mono text-card-foreground">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Product Info + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product Details */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Product Details</h3>
          <div className="space-y-3 text-sm">
            {product.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p className="text-card-foreground">{product.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sale Price</p>
                <p className="font-mono font-semibold text-card-foreground">${product.salePrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Commission</p>
                <p className="font-mono text-muted-foreground">${product.commission.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Amount</p>
                <p className="font-mono font-semibold text-card-foreground">${product.netAmount.toLocaleString()}</p>
              </div>
              {product.recurringPrice != null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recurring</p>
                  <p className="font-mono text-card-foreground">${product.recurringPrice}/mo</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{safeFormat(product.createdAt, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-2 rounded-xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold text-card-foreground mb-4">Revenue Over Time</h3>
          {stats.monthlyData.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="colorProductRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProductNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...cartesianGridDefaults} />
                  <XAxis {...xAxisDefaults} dataKey="month" />
                  <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "revenue" ? "Revenue" : "Net"]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorProductRev)" {...lineDefaults} />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--success, var(--primary)))" fill="url(#colorProductNet)" {...lineDefaults} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              No transaction data yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">Transaction History</h3>
          <Button size="sm" variant="outline" onClick={() => navigate(`/add-transaction/${product.id}`)}>
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            Add Transaction
          </Button>
        </div>
        {productTransactions.length > 0 ? (
          <div className="overflow-auto rounded-md border border-border">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sale Price</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commission</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-secondary transition-colors">
                    <TableCell className="text-sm text-muted-foreground">{safeFormat(tx.transactionDate, "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-sm text-card-foreground">{tx.platform}</TableCell>
                    <TableCell className="text-sm font-mono text-card-foreground">{tx.quantity}</TableCell>
                    <TableCell className="text-sm font-mono text-card-foreground">${Number(tx.totalAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">${Number(tx.commission).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-mono text-card-foreground">${Number(tx.netAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={tx.isPaid ? "default" : "secondary"} className="text-xs">
                        {tx.isPaid ? "Paid" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No transactions recorded yet for this product.
          </div>
        )}
      </motion.div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const category = fd.get("category") as "template" | "plugin";
              const salePrice = parseFloat(fd.get("sale_price") as string) || 0;
              const commissionVal = parseFloat(fd.get("commission") as string) || 0;
              try {
                await updateProductMutation.mutateAsync({
                  id: product.id,
                  name: fd.get("name") as string,
                  description: fd.get("description") as string || "",
                  price: salePrice,
                  category,
                  marketplace: fd.get("marketplace") as string || "",
                  company_id: ((fd.get("company_id") as string) !== "none" ? (fd.get("company_id") as string) : null) || null,
                  sale_price: salePrice,
                  commission: commissionVal,
                  net_amount: salePrice - commissionVal,
                  recurring_price: category === "plugin" ? (parseFloat(fd.get("recurring_price") as string) || null) : null,
                });
                toast({ title: "Success", description: "Product updated successfully" });
                setIsEditing(false);
              } catch {
                toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
              }
            }}
            className="space-y-5"
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input id="edit-name" name="name" defaultValue={product.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" name="description" defaultValue={product.description} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select name="category" defaultValue={product.category}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper" className="z-[1001]">
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="plugin">Plugin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Marketplace</Label>
                  <Input name="marketplace" defaultValue={product.marketplace} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Linked Company</Label>
                <Select name="company_id" defaultValue={product.companyId || "none"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" className="z-[1001]">
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Sale Price</Label>
                  <Input name="sale_price" type="number" step="0.01" min="0" defaultValue={product.salePrice} required />
                </div>
                <div className="grid gap-2">
                  <Label>Commission</Label>
                  <Input name="commission" type="number" step="0.01" min="0" defaultValue={product.commission} />
                </div>
                <div className="grid gap-2">
                  <Label>Monthly (plugins)</Label>
                  <Input name="recurring_price" type="number" step="0.01" min="0" defaultValue={product.recurringPrice ?? ""} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

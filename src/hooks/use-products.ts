import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "digital" | "physical";
  category: "template" | "plugin";
  marketplace: string;
  companyId: string | null;
  salePrice: number;
  commission: number;
  netAmount: number;
  recurringPrice: number | null;
  createdAt: string;
}

export interface ProductTransaction {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  totalAmount: number;
  netAmount: number;
  transactionDate: string;
  paymentMethod: string;
  isPaid: boolean;
  platform: string;
  commission: number;
  approximatePayoutDate: string | null;
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    price: Number(row.price),
    type: row.type as "digital" | "physical",
    category: (row.category as "template" | "plugin") || "template",
    marketplace: row.marketplace || "",
    companyId: row.company_id || null,
    salePrice: Number(row.sale_price || 0),
    commission: Number(row.commission || 0),
    netAmount: Number(row.net_amount || 0),
    recurringPrice: row.recurring_price != null ? Number(row.recurring_price) : null,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: any): ProductTransaction {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    totalAmount: Number(row.total_amount),
    netAmount: Number(row.net_amount),
    transactionDate: row.transaction_date,
    paymentMethod: row.payment_method || "",
    isPaid: row.is_paid || false,
    platform: row.platform || "",
    commission: Number(row.commission),
    approximatePayoutDate: row.approximate_payout_date,
  };
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  type: "digital" | "physical";
  category: "template" | "plugin";
  marketplace: string;
  company_id?: string | null;
  sale_price: number;
  commission: number;
  net_amount: number;
  recurring_price?: number | null;
}

export function useProducts() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const productsQuery = useQuery<Product[]>({
    queryKey: ["products", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) ?? []).map(mapProduct);
    },
    enabled: !!workspaceId,
  });

  const transactionsQuery = useQuery<ProductTransaction[]>({
    queryKey: ["product-transactions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_transactions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return ((data as any[]) ?? []).map(mapTransaction);
    },
    enabled: !!workspaceId,
  });

  const createProduct = useMutation({
    mutationFn: async (product: CreateProductInput) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("products" as any).insert({
        workspace_id: workspaceId,
        name: product.name,
        description: product.description,
        price: product.price,
        type: product.type,
        category: product.category,
        marketplace: product.marketplace,
        company_id: product.company_id || null,
        sale_price: product.sale_price,
        commission: product.commission,
        net_amount: product.net_amount,
        recurring_price: product.recurring_price ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (tx: {
      product_id?: string;
      product_name: string;
      quantity: number;
      total_amount: number;
      net_amount: number;
      commission: number;
      platform: string;
      transaction_date: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("product_transactions" as any).insert({
        workspace_id: workspaceId,
        ...tx,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-transactions", workspaceId] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("product_transactions" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-transactions", workspaceId] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_transactions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-transactions", workspaceId] });
    },
  });

  return {
    products: productsQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    isLoadingProducts: productsQuery.isLoading,
    isLoadingTransactions: transactionsQuery.isLoading,
    createProduct,
    deleteProduct,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

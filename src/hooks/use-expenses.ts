import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";

export interface ExpenseCategory {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Expense {
  id: string;
  workspace_id: string;
  category_id: string | null;
  title: string;
  amount: number;
  currency: string;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  recurring_end_date: string | null;
  vendor: string | null;
  is_tax_deductible: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringSubscription {
  id: string;
  workspace_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  vendor: string | null;
  notes: string | null;
  url: string | null;
  is_tax_deductible: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useExpenseCategories() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["expense_categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("name");
      if (error) throw error;
      const categories = (data ?? []) as ExpenseCategory[];

      // Seed default categories if none exist
      if (categories.length === 0 && workspaceId) {
        await supabase.rpc("seed_default_expense_categories", { ws_id: workspaceId });
        const { data: seeded } = await supabase
          .from("expense_categories")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("name");
        return (seeded ?? []) as ExpenseCategory[];
      }

      return categories;
    },
    enabled: !!workspaceId,
  });
}

export function useExpenses() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["expenses", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    enabled: !!workspaceId,
  });
}

export function useRecurringSubscriptions() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["recurring_subscriptions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("next_billing_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RecurringSubscription[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateExpense() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (expense: Partial<Expense>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("expenses")
        .insert([{ ...expense, workspace_id: workspaceId!, created_by: user?.id } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] });
      toast({ title: "Expense added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateExpense() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] });
      toast({ title: "Expense updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteExpense() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] });
      toast({ title: "Expense deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCreateCategory() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cat: { name: string; color?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from("expense_categories")
        .insert([{ ...cat, workspace_id: workspaceId! } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories", workspaceId] });
      toast({ title: "Category created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCategory() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories", workspaceId] });
      toast({ title: "Category deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCreateSubscription() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sub: Partial<RecurringSubscription>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("recurring_subscriptions")
        .insert([{ ...sub, workspace_id: workspaceId!, created_by: user?.id } as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions", workspaceId] });
      toast({ title: "Subscription added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateSubscription() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSubscription> & { id: string }) => {
      const { data, error } = await supabase
        .from("recurring_subscriptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions", workspaceId] });
      toast({ title: "Subscription updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSubscription() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_subscriptions", workspaceId] });
      toast({ title: "Subscription deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

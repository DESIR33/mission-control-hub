import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  amount: number;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  deal_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  invoice_number: string;
  status: string;
  amount: number;
  currency: string;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  due_date: string | null;
  issued_date: string | null;
  paid_date: string | null;
  line_items: InvoiceLineItem[];
  notes: string | null;
  payment_terms: string;
  stripe_invoice_id: string | null;
  stripe_payment_url: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_address: string | null;
  client_name: string | null;
  client_email: string | null;
  client_address: string | null;
  viewed_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInvoices() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["invoices", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Invoice[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateInvoice() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Partial<Invoice>) => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .insert({ ...invoice, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useSendToStripe() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke("invoice-manager", {
        body: { workspace_id: workspaceId, action: "create-stripe-invoice", invoice_id: invoiceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useSyncInvoiceStatuses() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invoice-manager", {
        body: { workspace_id: workspaceId, action: "sync-invoice-status" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useAutoGenerateInvoices() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invoice-manager", {
        body: { workspace_id: workspaceId, action: "auto-generate" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; created: number; invoice_numbers: string[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useNextInvoiceNumber() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["next-invoice-number", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices" as any)
        .select("invoice_number")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const record = data as any;
      if (record?.invoice_number) {
        const match = (record.invoice_number as string).match(/(\d+)$/);
        if (match) return `INV-${String(parseInt(match[1]) + 1).padStart(4, "0")}`;
      }
      return "INV-0001";
    },
    enabled: !!workspaceId,
  });
}

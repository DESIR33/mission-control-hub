import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface EmailFollowUp {
  id: string;
  workspace_id: string;
  email_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  reason: string;
  priority: string;
  suggested_action: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  // joined
  email?: { subject: string; from_name: string; from_email: string; received_at: string };
  contact?: { first_name: string; last_name: string | null };
  deal?: { title: string; stage: string; value: number | null };
}

export function useEmailFollowUps() {
  const { workspaceId } = useWorkspace();
  return useQuery<EmailFollowUp[]>({
    queryKey: ["email-follow-ups", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("email_follow_ups")
        .select("*, inbox_emails(subject, from_name, from_email, received_at), contacts(first_name, last_name), deals(title, stage, value)")
        .eq("workspace_id", workspaceId)
        .is("completed_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        email: r.inbox_emails ?? undefined,
        contact: r.contacts ?? undefined,
        deal: r.deals ?? undefined,
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("email_follow_ups").update({ completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Follow-up completed"); qc.invalidateQueries({ queryKey: ["email-follow-ups"] }); },
  });
}

export function useCreateFollowUp() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email_id?: string; contact_id?: string; deal_id?: string; reason: string; priority: string; suggested_action?: string; due_date?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("email_follow_ups").insert({ workspace_id: workspaceId, ...data });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Follow-up created"); qc.invalidateQueries({ queryKey: ["email-follow-ups"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

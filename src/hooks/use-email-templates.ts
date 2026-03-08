import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  workspace_id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  variables: Array<{ key: string; label: string; source?: string }>;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export function useEmailTemplates() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["email-templates", workspaceId],
    queryFn: async (): Promise<EmailTemplate[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("usage_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmailTemplate[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateEmailTemplate() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Pick<EmailTemplate, "name" | "category" | "subject_template" | "body_template" | "variables">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase
        .from("email_templates" as any)
        .insert({ workspace_id: workspaceId, ...template } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template created");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });
}

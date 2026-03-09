import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface EmailComment {
  id: string;
  workspace_id: string;
  email_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null };
}

export function useEmailComments(emailId: string | undefined) {
  const { workspaceId } = useWorkspace();
  return useQuery<EmailComment[]>({
    queryKey: ["email-comments", emailId],
    queryFn: async () => {
      if (!emailId || !workspaceId) return [];
      const { data, error } = await query("email_comments")
        .select("*, profiles(full_name, email)")
        .eq("email_id", emailId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({ ...c, profile: c.profiles ?? undefined }));
    },
    enabled: !!emailId && !!workspaceId,
  });
}

export function useAddEmailComment() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ emailId, content }: { emailId: string; content: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await query("email_comments").insert({
        workspace_id: workspaceId,
        email_id: emailId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["email-comments", vars.emailId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

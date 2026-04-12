import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export type EmailCategory = "marketing" | "opportunity" | "spam" | "newsletter" | null;

/** Classify all uncategorized emails in the inbox using AI */
export function useClassifyEmails() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: emails, error } = await supabase
        .from("inbox_emails" as any)
        .select("id, subject, from_email, from_name, preview")
        .eq("workspace_id", workspaceId)
        .is("ai_category" as any, null)
        .limit(200);

      if (error) throw error;
      const uncategorized = (emails ?? []) as any[];
      if (uncategorized.length === 0) return { classified: 0 };

      const { data: result, error: fnError } = await supabase.functions.invoke("classify-emails", {
        body: {
          workspace_id: workspaceId,
          emails: uncategorized.map((e: any) => ({
            id: e.id,
            subject: e.subject,
            from_email: e.from_email,
            from_name: e.from_name,
            preview: e.preview,
          })),
        },
      });

      if (fnError) throw fnError;
      return result as { classified: number };
    },
    onSuccess: (data) => {
      toast.success(`Classified ${data?.classified ?? 0} emails`);
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
    },
    onError: (err: Error) => {
      toast.error(`Classification failed: ${err.message}`);
    },
  });
}

/** Manually set the category for one or more emails, propagating to all emails from the same sender */
export function useSetEmailCategory() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailIds, category }: { emailIds: string[]; category: EmailCategory }) => {
      if (!workspaceId) throw new Error("No workspace");

      // Update selected emails
      for (const id of emailIds) {
        const { error } = await supabase
          .from("inbox_emails" as any)
          .update({ ai_category: category } as any)
          .eq("id", id);
        if (error) throw error;
      }

      // Get sender addresses of selected emails
      const { data: selected } = await supabase
        .from("inbox_emails" as any)
        .select("from_email")
        .in("id", emailIds);

      const senderEmails = [...new Set((selected ?? []).map((e: any) => e.from_email).filter(Boolean))];

      // Propagate to all other emails from the same senders in this workspace
      let propagated = 0;
      for (const senderEmail of senderEmails) {
        const { data: updated } = await supabase
          .from("inbox_emails" as any)
          .update({ ai_category: category } as any)
          .eq("workspace_id", workspaceId)
          .eq("from_email", senderEmail)
          .not("id", "in", `(${emailIds.join(",")})`)
          .select("id");
        propagated += (updated ?? []).length;
      }

      return { updated: emailIds.length, propagated, category };
    },
    onSuccess: (data) => {
      const label = data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1) : "Uncategorized";
      const extra = data.propagated > 0 ? ` (+${data.propagated} from same sender)` : "";
      toast.success(`${data.updated} email(s) marked as ${label}${extra}`);
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to set category: ${err.message}`);
    },
  });
}

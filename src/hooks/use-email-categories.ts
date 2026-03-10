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

      // Fetch uncategorized emails
      const { data: emails, error } = await supabase
        .from("inbox_emails" as any)
        .select("id, subject, from_email, from_name, preview")
        .eq("workspace_id", workspaceId)
        .is("ai_category" as any, null)
        .limit(200);

      if (error) throw error;
      const uncategorized = (emails ?? []) as any[];
      if (uncategorized.length === 0) return { classified: 0 };

      // Call edge function for AI classification
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

/** Manually set the category for one or more emails */
export function useSetEmailCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailIds, category }: { emailIds: string[]; category: EmailCategory }) => {
      for (const id of emailIds) {
        const { error } = await supabase
          .from("inbox_emails" as any)
          .update({ ai_category: category } as any)
          .eq("id", id);
        if (error) throw error;
      }
      return { updated: emailIds.length, category };
    },
    onSuccess: (data) => {
      const label = data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1) : "Uncategorized";
      toast.success(`${data.updated} email(s) marked as ${label}`);
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to set category: ${err.message}`);
    },
  });
}

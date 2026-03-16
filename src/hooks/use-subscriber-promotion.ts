import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Subscriber } from "@/types/subscriber";

export function usePromoteSubscriber() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriber: Subscriber) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data: { user } } = await supabase.auth.getUser();

      // Create contact from subscriber data
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          workspace_id: workspaceId,
          first_name: subscriber.first_name ?? subscriber.email.split("@")[0],
          last_name: subscriber.last_name,
          email: subscriber.email,
          status: "lead",
          source: `Subscriber (${subscriber.source ?? "website"})`,
          city: subscriber.city,
          state: subscriber.state,
          country: subscriber.country,
          notes: [
            subscriber.notes,
            `Promoted from subscriber on ${new Date().toISOString().split("T")[0]}`,
            subscriber.guide_requested ? `Guide requested: ${subscriber.guide_requested}` : null,
            subscriber.source_video_title ? `Source video: ${subscriber.source_video_title}` : null,
          ].filter(Boolean).join("\n"),
          created_by: user?.id,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Link subscriber to contact
      const { error: updateError } = await supabase
        .from("subscribers" as any)
        .update({ promoted_to_contact_id: contact.id })
        .eq("id", subscriber.id)
        .eq("workspace_id", workspaceId);

      if (updateError) throw updateError;

      // Log activity on the new contact
      await supabase
        .from("activities")
        .insert({
          workspace_id: workspaceId,
          entity_id: contact.id,
          entity_type: "contact",
          activity_type: "note",
          title: "Promoted from Subscriber",
          description: `Subscriber since ${subscriber.created_at.split("T")[0]}. Engagement score: ${subscriber.engagement_score}.`,
          performed_by: user?.id,
        });

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["contacts", workspaceId] });
    },
  });
}

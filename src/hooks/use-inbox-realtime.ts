import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { toast } from "sonner";

/**
 * Subscribes to realtime INSERT events on inbox_emails.
 * - Invalidates inbox queries so new emails appear instantly.
 * - Creates a notification for VIP / known contact / company emails.
 */
export function useInboxRealtime() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();

  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`inbox-realtime-${workspaceId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_emails",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload: any) => {
          const newEmail = payload.new;
          if (!newEmail) return;

          // Invalidate inbox queries
          queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
          queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
          queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });

          // Check if sender is a known contact
          const senderEmail = (newEmail.from_email || "").toLowerCase();
          const senderName = newEmail.from_name || senderEmail;
          const matchedContact = contacts.find(
            (c) => c.email?.toLowerCase() === senderEmail
          );

          // Check if sender belongs to a known company (by domain)
          const senderDomain = senderEmail.split("@")[1];
          const matchedCompany = companies.find((co) => {
            const coEmail = co.primary_email?.toLowerCase() || "";
            const coDomain = coEmail.split("@")[1];
            return coDomain && senderDomain === coDomain;
          });

          const isVip =
            matchedContact?.vip_tier &&
            matchedContact.vip_tier !== "none";

          // Create notification for VIP, known contact, or company match
          if (isVip || matchedContact || matchedCompany) {
            let title = `New email from ${senderName}`;
            let body = newEmail.subject || "(No subject)";
            let type = "new_contact"; // reuse existing type

            if (isVip) {
              title = `⭐ VIP email from ${senderName}`;
              body = `[${matchedContact!.vip_tier?.toUpperCase()}] ${newEmail.subject || "(No subject)"}`;
            } else if (matchedContact) {
              title = `New email from contact ${matchedContact.first_name} ${matchedContact.last_name || ""}`.trim();
            } else if (matchedCompany) {
              title = `New email from ${matchedCompany.name}`;
              body = `${senderName}: ${newEmail.subject || "(No subject)"}`;
            }

            try {
              await supabase.from("notifications").insert({
                workspace_id: workspaceId,
                type,
                title,
                body,
                entity_type: "inbox_email",
                entity_id: newEmail.id,
              } as any);
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
            } catch (err) {
              console.error("Failed to create notification:", err);
            }

            // Show a toast for immediate visibility
            toast.info(title, { description: body });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, contacts, companies, queryClient]);
}

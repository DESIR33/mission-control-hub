import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { toast } from "sonner";

/**
 * Subscribes to realtime events on inbox_emails:
 * - INSERT: new emails appear instantly + VIP/contact/company notifications
 * - UPDATE: read status changes reflected immediately
 * - DELETE: removed emails disappear from inbox
 */
export function useInboxRealtime() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();

  // Use refs so the callback always has latest data without re-subscribing
  const contactsRef = useRef(contacts);
  const companiesRef = useRef(companies);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { companiesRef.current = companies; }, [companies]);

  useEffect(() => {
    if (!workspaceId) return;

    const invalidateInbox = () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });
    };

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

          invalidateInbox();

          // Check VIP / contact / company
          const senderEmail = (newEmail.from_email || "").toLowerCase();
          const senderName = newEmail.from_name || senderEmail;
          const currentContacts = contactsRef.current;
          const currentCompanies = companiesRef.current;

          const matchedContact = currentContacts.find(
            (c) => c.email?.toLowerCase() === senderEmail
          );

          const senderDomain = senderEmail.split("@")[1];
          const matchedCompany = currentCompanies.find((co) => {
            const coEmail = co.primary_email?.toLowerCase() || "";
            const coDomain = coEmail.split("@")[1];
            return coDomain && senderDomain === coDomain;
          });

          const isVip = matchedContact?.vip_tier && matchedContact.vip_tier !== "none";

          if (isVip || matchedContact || matchedCompany) {
            let title = `New email from ${senderName}`;
            let body = newEmail.subject || "(No subject)";

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
                type: "new_contact",
                title,
                body,
                entity_type: "inbox_email",
                entity_id: newEmail.id,
              } as any);
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
            } catch (err) {
              console.error("Failed to create notification:", err);
            }

            toast.info(title, { description: body });
          }
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "inbox_emails",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          // Read status, folder changes, etc.
          invalidateInbox();
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "DELETE",
          schema: "public",
          table: "inbox_emails",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          invalidateInbox();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);
}

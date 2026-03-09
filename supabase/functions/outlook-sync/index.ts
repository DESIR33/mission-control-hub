import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface OutlookMessage {
  id: string;
  conversationId?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: string };
  receivedDateTime?: string;
  isRead?: boolean;
  importance?: string;
  hasAttachments?: boolean;
  parentFolderId?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope: "openid profile email offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function fetchAllOutlookMessages(
  accessToken: string,
  folder: string = "inbox",
): Promise<OutlookMessage[]> {
  const allMessages: OutlookMessage[] = [];
  const pageSize = 250;
  let url: string | null = `${GRAPH_BASE}/me/mailFolders/${folder}/messages?$top=${pageSize}&$orderby=receivedDateTime desc&$select=id,conversationId,from,toRecipients,subject,bodyPreview,body,receivedDateTime,isRead,importance,hasAttachments,parentFolderId`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const messages: OutlookMessage[] = data.value || [];
    allMessages.push(...messages);

    url = data["@odata.nextLink"] || null;
    console.log(`Fetched page: ${messages.length} messages (total so far: ${allMessages.length})`);
  }

  return allMessages;
}

function mapGraphFolderToDb(graphFolder: string): string {
  const map: Record<string, string> = {
    inbox: "inbox",
    sentitems: "sent",
    junkemail: "junk",
    deleteditems: "trash",
    archive: "archive",
    drafts: "drafts",
  };
  return map[graphFolder.toLowerCase()] || graphFolder;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, folder = "inbox", sync_all_folders = false } = await req.json();

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get Outlook credentials from workspace_integrations
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "ms_outlook")
      .single();

    if (intError || !integration?.config) {
      return new Response(
        JSON.stringify({ error: "Outlook integration not configured. Please connect Microsoft Outlook in Settings → Integrations." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = integration.config as Record<string, string>;
    const { tenant_id, client_id, client_secret, refresh_token } = config;

    if (!tenant_id || !client_id || !client_secret || !refresh_token) {
      return new Response(
        JSON.stringify({ error: "Outlook integration is missing required credentials (tenant_id, client_id, client_secret, refresh_token)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get access token (and possibly rotated refresh token)
    const tokenResult = await refreshAccessToken(tenant_id, client_id, client_secret, refresh_token);

    // Persist rotated refresh token if Microsoft returned a new one
    if (tokenResult.refresh_token && tokenResult.refresh_token !== refresh_token) {
      const updatedConfig = { ...config, refresh_token: tokenResult.refresh_token };
      await supabase
        .from("workspace_integrations")
        .update({ config: updatedConfig })
        .eq("workspace_id", workspace_id)
        .eq("integration_key", "ms_outlook");
    }

    // Determine which folders to sync
    const foldersToSync = sync_all_folders
      ? ["inbox", "sentitems", "junkemail", "deleteditems", "archive"]
      : [folder];

    let totalFetched = 0;
    let totalUpserted = 0;
    let totalDeleted = 0;
    let totalReadUpdated = 0;

    for (const syncFolder of foldersToSync) {
      console.log(`Syncing folder: ${syncFolder}`);

      // Fetch ALL messages from Outlook (paginated)
      const messages = await fetchAllOutlookMessages(tokenResult.access_token, syncFolder);
      totalFetched += messages.length;

      const dbFolder = mapGraphFolderToDb(syncFolder);

      // Build set of Outlook message IDs for this folder
      const outlookMessageIds = new Set(messages.map((m) => m.id));

      // ── Delta: Delete emails from DB that no longer exist in Outlook ──
      const { data: existingEmails } = await supabase
        .from("inbox_emails")
        .select("id, message_id, is_read")
        .eq("workspace_id", workspace_id)
        .eq("folder", dbFolder);

      if (existingEmails && existingEmails.length > 0) {
        const toDelete = existingEmails.filter(
          (e: any) => !outlookMessageIds.has(e.message_id)
        );
        if (toDelete.length > 0) {
          const deleteIds = toDelete.map((e: any) => e.id);
          const CHUNK = 200;
          for (let i = 0; i < deleteIds.length; i += CHUNK) {
            const chunk = deleteIds.slice(i, i + CHUNK);
            const { error: delErr } = await supabase
              .from("inbox_emails")
              .delete()
              .in("id", chunk);
            if (delErr) {
              console.error(`Delete error (${syncFolder}):`, JSON.stringify(delErr));
            } else {
              totalDeleted += chunk.length;
            }
          }
          console.log(`Deleted ${toDelete.length} emails from ${dbFolder} (removed in Outlook)`);
        }

        // ── Delta: Update read status for emails that changed in Outlook ──
        const outlookReadMap = new Map<string, boolean>();
        messages.forEach((m) => {
          outlookReadMap.set(m.id, m.isRead ?? false);
        });

        const toUpdateRead: string[] = [];
        const toUpdateUnread: string[] = [];
        existingEmails.forEach((e: any) => {
          if (!outlookMessageIds.has(e.message_id)) return; // already deleted
          const outlookIsRead = outlookReadMap.get(e.message_id);
          if (outlookIsRead !== undefined && outlookIsRead !== e.is_read) {
            if (outlookIsRead) {
              toUpdateRead.push(e.id);
            } else {
              toUpdateUnread.push(e.id);
            }
          }
        });

        if (toUpdateRead.length > 0) {
          const { error: readErr } = await supabase
            .from("inbox_emails")
            .update({ is_read: true })
            .in("id", toUpdateRead);
          if (readErr) console.error("Read update error:", JSON.stringify(readErr));
          else totalReadUpdated += toUpdateRead.length;
          console.log(`Marked ${toUpdateRead.length} emails as read (synced from Outlook)`);
        }

        if (toUpdateUnread.length > 0) {
          const { error: unreadErr } = await supabase
            .from("inbox_emails")
            .update({ is_read: false })
            .in("id", toUpdateUnread);
          if (unreadErr) console.error("Unread update error:", JSON.stringify(unreadErr));
          else totalReadUpdated += toUpdateUnread.length;
          console.log(`Marked ${toUpdateUnread.length} emails as unread (synced from Outlook)`);
        }
      }

      // ── Upsert current messages ──
      const rows = messages.map((msg) => {
        const fromEmail = msg.from?.emailAddress?.address || "";
        const fromName = msg.from?.emailAddress?.name || "";
        const toRecipients = (msg.toRecipients || []).map((r) => ({
          name: r.emailAddress?.name || "",
          email: r.emailAddress?.address || "",
        }));

        return {
          workspace_id,
          message_id: msg.id,
          conversation_id: msg.conversationId || null,
          from_email: fromEmail,
          from_name: fromName,
          to_recipients: toRecipients,
          subject: msg.subject || "",
          preview: msg.bodyPreview || "",
          body_html: msg.body?.content || null,
          received_at: msg.receivedDateTime || new Date().toISOString(),
          is_read: msg.isRead ?? false,
          importance: msg.importance || "normal",
          has_attachments: msg.hasAttachments ?? false,
          folder: dbFolder,
        };
      });

      if (rows.length > 0) {
        const CHUNK_SIZE = 200;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          const { error: upsertError } = await supabase
            .from("inbox_emails")
            .upsert(chunk, { onConflict: "workspace_id,message_id" });

          if (upsertError) {
            console.error(`Batch upsert error (${syncFolder}, chunk ${i / CHUNK_SIZE + 1}):`, JSON.stringify(upsertError));
            throw new Error(`Failed to upsert emails: ${upsertError.message}`);
          }
          totalUpserted += chunk.length;
          console.log(`Upserted ${syncFolder} chunk: ${chunk.length} emails (total: ${totalUpserted})`);
        }
      } else {
        console.log(`No messages in folder: ${syncFolder}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: totalFetched,
        upserted: totalUpserted,
        deleted: totalDeleted,
        read_status_updated: totalReadUpdated,
        folders_synced: foldersToSync,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("outlook-sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

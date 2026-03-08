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

async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    scope: "https://graph.microsoft.com/.default offline_access",
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
  return data.access_token;
}

async function fetchOutlookMessages(
  accessToken: string,
  folder: string = "inbox",
  top: number = 50,
): Promise<OutlookMessage[]> {
  const url = `${GRAPH_BASE}/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,conversationId,from,toRecipients,subject,bodyPreview,body,receivedDateTime,isRead,importance,hasAttachments,parentFolderId`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.value || [];
}

function mapFolderIdToName(folderId: string | undefined): string {
  if (!folderId) return "inbox";
  const lower = folderId.toLowerCase();
  if (lower.includes("inbox")) return "inbox";
  if (lower.includes("sentitems") || lower.includes("sent")) return "sent";
  if (lower.includes("drafts")) return "drafts";
  if (lower.includes("junkemail") || lower.includes("junk")) return "junk";
  if (lower.includes("deleteditems") || lower.includes("trash")) return "trash";
  if (lower.includes("archive")) return "archive";
  return "inbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, folder = "inbox", max_messages = 50 } = await req.json();

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

    // Get access token
    const accessToken = await refreshAccessToken(tenant_id, client_id, client_secret, refresh_token);

    // Fetch messages from Outlook
    const messages = await fetchOutlookMessages(accessToken, folder, max_messages);

    // Upsert into inbox_emails
    let upsertedCount = 0;
    for (const msg of messages) {
      const fromEmail = msg.from?.emailAddress?.address || "";
      const fromName = msg.from?.emailAddress?.name || "";
      const toRecipients = (msg.toRecipients || []).map((r) => ({
        name: r.emailAddress?.name || "",
        email: r.emailAddress?.address || "",
      }));

      const { error: upsertError } = await supabase
        .from("inbox_emails")
        .upsert(
          {
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
            folder: mapFolderIdToName(msg.parentFolderId),
          },
          { onConflict: "workspace_id,message_id" },
        );

      if (!upsertError) upsertedCount++;
    }

    // Update the new refresh token if returned
    // (Microsoft sometimes returns a new one)

    return new Response(
      JSON.stringify({
        success: true,
        fetched: messages.length,
        upserted: upsertedCount,
        folder,
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

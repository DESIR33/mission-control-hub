import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ------------------------------------------------------------------ */
/*  Slack Block-Kit helpers                                           */
/* ------------------------------------------------------------------ */

function alertBlocks(alert: {
  title: string;
  body?: string;
  severity?: string;
  link?: string;
}) {
  const emoji =
    alert.severity === "critical"
      ? "🚨"
      : alert.severity === "warning"
      ? "⚠️"
      : "ℹ️";

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${alert.title}`, emoji: true },
    },
  ];

  if (alert.body) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: alert.body },
    });
  }

  if (alert.link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in Dashboard" },
          url: alert.link,
          action_id: "open_dashboard",
        },
      ],
    });
  }

  return blocks;
}

function briefingBlocks(briefing: {
  title: string;
  sections: Array<{ heading: string; content: string }>;
  date?: string;
}) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 ${briefing.title}`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: briefing.date || new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        },
      ],
    },
    { type: "divider" },
  ];

  for (const section of briefing.sections) {
    blocks.push(
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${section.heading}*\n${section.content}` },
      },
      { type: "divider" }
    );
  }

  return blocks;
}

function approvalBlocks(approval: {
  title: string;
  description?: string;
  proposal_id: string;
  agent_name?: string;
  confidence?: number;
  proposed_changes?: Record<string, any>;
}) {
  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🤖 Agent Action Approval`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${approval.title}*${approval.agent_name ? `\n_Agent: ${approval.agent_name}_` : ""}${
          approval.confidence ? `\n_Confidence: ${Math.round(approval.confidence * 100)}%_` : ""
        }`,
      },
    },
  ];

  if (approval.description) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: approval.description },
    });
  }

  if (approval.proposed_changes && Object.keys(approval.proposed_changes).length > 0) {
    const changesText = Object.entries(approval.proposed_changes)
      .map(([k, v]) => `• *${k}*: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Proposed Changes:*\n${changesText}` },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Approve" },
        style: "primary",
        action_id: `approve_${approval.proposal_id}`,
        value: approval.proposal_id,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Reject" },
        style: "danger",
        action_id: `reject_${approval.proposal_id}`,
        value: approval.proposal_id,
      },
    ],
  });

  return blocks;
}

/* ------------------------------------------------------------------ */
/*  Slack API helper                                                  */
/* ------------------------------------------------------------------ */

async function postToSlack(
  botToken: string,
  channel: string,
  text: string,
  blocks?: any[]
) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Slack API error: ${json.error}`);
  }
  return json;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                      */
/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { workspace_id, type, payload, channel_id } = body;

    if (!workspace_id || !type) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id or type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Slack credentials from workspace integrations
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "slack")
      .single();

    if (intError || !integration?.config?.bot_token) {
      return new Response(
        JSON.stringify({ error: "Slack not connected. Add your bot token in Settings → Integrations." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = integration.config.bot_token;
    const defaultChannel = channel_id || integration.config.default_channel_id;

    if (!defaultChannel) {
      return new Response(
        JSON.stringify({ error: "No channel specified and no default channel configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let text: string;
    let blocks: any[] | undefined;

    switch (type) {
      case "alert": {
        const alert = payload as { title: string; body?: string; severity?: string; link?: string };
        text = `${alert.title}${alert.body ? ": " + alert.body : ""}`;
        blocks = alertBlocks(alert);
        break;
      }

      case "briefing": {
        const briefing = payload as {
          title: string;
          sections: Array<{ heading: string; content: string }>;
          date?: string;
        };
        text = briefing.title;
        blocks = briefingBlocks(briefing);
        break;
      }

      case "approval": {
        const approval = payload as {
          title: string;
          description?: string;
          proposal_id: string;
          agent_name?: string;
          confidence?: number;
          proposed_changes?: Record<string, any>;
        };
        if (!approval.proposal_id) {
          return new Response(
            JSON.stringify({ error: "approval type requires payload.proposal_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        text = `Agent action approval: ${approval.title}`;
        blocks = approvalBlocks(approval);
        break;
      }

      case "test": {
        text = "✅ Mission Control Hub is connected to Slack!";
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "✅ *Mission Control Hub* is connected to this channel.\n\nYou'll receive:\n• 🚨 Real-time alerts\n• 📋 Daily briefings\n• 🤖 Agent action approvals",
            },
          },
        ];
        break;
      }

      case "custom": {
        text = payload?.text || "Notification from Mission Control";
        if (payload?.blocks) blocks = payload.blocks;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown type: ${type}. Use: alert, briefing, approval, test, custom` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const result = await postToSlack(botToken, defaultChannel, text, blocks);

    return new Response(
      JSON.stringify({ success: true, ts: result.ts, channel: result.channel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("slack-notify error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

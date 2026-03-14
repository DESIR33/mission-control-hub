import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Weekly Competitor Sponsor Scan & Digest
 *
 * 1. Finds all workspaces with competitor channels configured
 * 2. Calls scan-competitor-sponsors for each workspace
 * 3. Identifies NEW sponsors discovered this week
 * 4. Sends a Slack digest notification with the findings
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Allow targeting a specific workspace or scan all with competitor channels
    let targetWorkspaceIds: string[] = [];

    try {
      const body = await req.json();
      if (body?.workspace_id) {
        targetWorkspaceIds = [body.workspace_id];
      }
    } catch {
      // No body — scan all workspaces
    }

    if (targetWorkspaceIds.length === 0) {
      // Find all workspaces that have competitor channels
      const { data: channels } = await supabase
        .from("competitor_channels")
        .select("workspace_id")
        .limit(200);

      const wsSet = new Set((channels || []).map((c) => c.workspace_id));
      targetWorkspaceIds = Array.from(wsSet);
    }

    if (targetWorkspaceIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No workspaces with competitor channels found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: Array<{
      workspace_id: string;
      scanned: number;
      new_sponsors: number;
      hot_leads: number;
      slack_sent: boolean;
    }> = [];

    for (const wsId of targetWorkspaceIds) {
      try {
        // Record sponsors before scan to detect new ones
        const { data: existingSponsors } = await supabase
          .from("competitor_sponsors")
          .select("id, sponsor_name")
          .eq("workspace_id", wsId)
          .eq("dismissed", false);

        const existingIds = new Set((existingSponsors || []).map((s) => s.id));

        // Trigger the scan
        const scanRes = await fetch(`${supabaseUrl}/functions/v1/scan-competitor-sponsors`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspace_id: wsId }),
        });

        const scanData = await scanRes.json();
        if (!scanData.success) {
          console.error(`Scan failed for workspace ${wsId}:`, scanData.error);
          results.push({ workspace_id: wsId, scanned: 0, new_sponsors: 0, hot_leads: 0, slack_sent: false });
          continue;
        }

        // Get sponsors after scan to find new ones
        const { data: allSponsors } = await supabase
          .from("competitor_sponsors")
          .select("id, sponsor_name, sponsor_url, competitor_channels, mention_count, outreach_status, outreach_suggestion")
          .eq("workspace_id", wsId)
          .eq("dismissed", false)
          .order("mention_count", { ascending: false });

        const newSponsors = (allSponsors || []).filter((s) => !existingIds.has(s.id));
        const hotLeads = (allSponsors || []).filter(
          (s) => (s.competitor_channels?.length || 0) >= 2 && s.outreach_status === "not_contacted",
        );

        // Build and send Slack digest
        let slackSent = false;

        // Check if Slack is configured
        const { data: slackIntegration } = await supabase
          .from("workspace_integrations")
          .select("config")
          .eq("workspace_id", wsId)
          .eq("integration_key", "slack")
          .single();

        if (slackIntegration?.config?.bot_token) {
          const sections: Array<{ heading: string; content: string }> = [];

          // Summary section
          sections.push({
            heading: "📊 Scan Summary",
            content: [
              `• Channels scanned: *${scanData.scanned}*`,
              `• Total sponsors tracked: *${(allSponsors || []).length}*`,
              `• New sponsors this week: *${newSponsors.length}*`,
              `• Hot leads (multi-channel): *${hotLeads.length}*`,
            ].join("\n"),
          });

          // New sponsors section
          if (newSponsors.length > 0) {
            const sponsorLines = newSponsors.slice(0, 8).map((s) => {
              const channels = s.competitor_channels?.slice(0, 3).join(", ") || "unknown";
              const url = s.sponsor_url ? ` (<${s.sponsor_url}|website>)` : "";
              return `• *${s.sponsor_name}*${url} — seen on: ${channels}`;
            });
            if (newSponsors.length > 8) {
              sponsorLines.push(`_…and ${newSponsors.length - 8} more_`);
            }
            sections.push({
              heading: "🆕 New Sponsors Discovered",
              content: sponsorLines.join("\n"),
            });
          }

          // Hot leads section
          if (hotLeads.length > 0) {
            const leadLines = hotLeads.slice(0, 5).map((s) => {
              const count = s.competitor_channels?.length || 0;
              return `• 🔥 *${s.sponsor_name}* — sponsors *${count}* competitors (${s.competitor_channels?.slice(0, 3).join(", ")})`;
            });
            if (hotLeads.length > 5) {
              leadLines.push(`_…and ${hotLeads.length - 5} more hot leads_`);
            }
            sections.push({
              heading: "🎯 Hot Leads — Outreach Recommended",
              content: leadLines.join("\n"),
            });
          }

          // Action items
          const notContacted = (allSponsors || []).filter((s) => s.outreach_status === "not_contacted").length;
          if (notContacted > 0) {
            sections.push({
              heading: "📝 Action Items",
              content: `*${notContacted}* sponsor${notContacted !== 1 ? "s" : ""} haven't been contacted yet. Review opportunities in the Competitor Sponsor Scanner dashboard.`,
            });
          }

          // Send via slack-notify
          try {
            const notifyRes = await fetch(`${supabaseUrl}/functions/v1/slack-notify`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                workspace_id: wsId,
                type: "briefing",
                payload: {
                  title: "Weekly Sponsor Scan Digest",
                  sections,
                },
              }),
            });

            const notifyData = await notifyRes.json();
            slackSent = !!notifyData.success;
          } catch (slackErr) {
            console.error(`Slack notification failed for ${wsId}:`, slackErr);
          }
        }

        // Log an activity for the scan
        await supabase.from("activities").insert({
          workspace_id: wsId,
          entity_type: "system",
          entity_id: wsId,
          activity_type: "weekly_sponsor_scan",
          title: "Weekly Competitor Sponsor Scan",
          description: `Scanned ${scanData.scanned} channels. Found ${newSponsors.length} new sponsors. ${hotLeads.length} hot leads identified.`,
          metadata: {
            scanned_channels: scanData.scanned,
            new_sponsors: newSponsors.length,
            hot_leads: hotLeads.length,
            total_sponsors: (allSponsors || []).length,
            slack_notified: slackSent,
          },
        });

        results.push({
          workspace_id: wsId,
          scanned: scanData.scanned,
          new_sponsors: newSponsors.length,
          hot_leads: hotLeads.length,
          slack_sent: slackSent,
        });
      } catch (wsErr) {
        console.error(`Error processing workspace ${wsId}:`, wsErr);
        results.push({ workspace_id: wsId, scanned: 0, new_sponsors: 0, hot_leads: 0, slack_sent: false });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        workspaces_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("weekly-sponsor-scan error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

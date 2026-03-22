import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all active subscribers with engagement data
    const { data: subscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, email, first_name, engagement_score, engagement_data, status")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (subError) throw subError;

    const results: any[] = [];

    for (const sub of subscribers ?? []) {
      const engagement = sub.engagement_data as any ?? {};
      const emailsSent = engagement.emails_sent ?? 0;
      const emailsOpened = engagement.emails_opened ?? 0;
      const emailsClicked = engagement.emails_clicked ?? 0;

      if (emailsSent < 3) continue; // Not enough data

      const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
      const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;

      // Calculate days since last interaction
      const lastOpen = engagement.last_email_opened_at
        ? Math.floor((Date.now() - new Date(engagement.last_email_opened_at).getTime()) / 86400000)
        : null;
      const lastClick = engagement.last_clicked_at
        ? Math.floor((Date.now() - new Date(engagement.last_clicked_at).getTime()) / 86400000)
        : null;

      // Declining engagement detection
      const decliningOpens = openRate < 20;
      const decliningClicks = clickRate < 5;

      // Risk score calculation (0-100)
      let riskScore = 0;

      // Low open rate contributes to risk
      if (openRate < 10) riskScore += 30;
      else if (openRate < 20) riskScore += 20;
      else if (openRate < 30) riskScore += 10;

      // Low click rate
      if (clickRate < 2) riskScore += 20;
      else if (clickRate < 5) riskScore += 10;

      // Days since last open
      if (lastOpen !== null) {
        if (lastOpen > 60) riskScore += 30;
        else if (lastOpen > 30) riskScore += 20;
        else if (lastOpen > 14) riskScore += 10;
      } else {
        riskScore += 25; // Never opened
      }

      // Low engagement score from overall system
      if (sub.engagement_score < 25) riskScore += 20;
      else if (sub.engagement_score < 50) riskScore += 10;

      riskScore = Math.min(riskScore, 100);

      const riskLevel =
        riskScore >= 80 ? "critical" :
        riskScore >= 60 ? "high" :
        riskScore >= 40 ? "medium" : "low";

      // Only store medium+ risk
      if (riskScore < 40) continue;

      results.push({
        workspace_id,
        subscriber_id: sub.id,
        risk_score: riskScore,
        risk_level: riskLevel,
        declining_opens: decliningOpens,
        declining_clicks: decliningClicks,
        days_since_last_open: lastOpen,
        days_since_last_click: lastClick,
        recent_open_rate: Math.round(openRate * 100) / 100,
        recent_click_rate: Math.round(clickRate * 100) / 100,
        last_calculated_at: new Date().toISOString(),
      });
    }

    // Upsert churn risk records
    if (results.length > 0) {
      const { error: upsertError } = await supabase
        .from("subscriber_churn_risk")
        .upsert(results, { onConflict: "workspace_id,subscriber_id" });
      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({
        processed: (subscribers ?? []).length,
        at_risk: results.length,
        critical: results.filter((r) => r.risk_level === "critical").length,
        high: results.filter((r) => r.risk_level === "high").length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Churn detection error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

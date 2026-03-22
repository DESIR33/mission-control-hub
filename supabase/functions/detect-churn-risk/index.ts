import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tier thresholds
const THRESHOLDS = {
  low:      { min: 20, max: 39 },
  medium:   { min: 40, max: 59 },
  high:     { min: 60, max: 79 },
  critical: { min: 80, max: 100 },
};

// Journey config per tier
const JOURNEY_CONFIG: Record<string, { delay_days: number; touches: number; intensity: string }> = {
  low:      { delay_days: 14, touches: 1, intensity: "gentle" },
  medium:   { delay_days: 7,  touches: 2, intensity: "moderate" },
  high:     { delay_days: 3,  touches: 3, intensity: "aggressive" },
  critical: { delay_days: 1,  touches: 4, intensity: "urgent" },
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

    // Fetch active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, email, first_name, engagement_score, engagement_data, status")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (subError) throw subError;

    // Fetch existing churn records to detect saves
    const { data: existingRisks } = await supabase
      .from("subscriber_churn_risk")
      .select("subscriber_id, risk_score, risk_level, journey_tier, journey_started_at, saved, pre_journey_open_rate")
      .eq("workspace_id", workspace_id);

    const existingMap = new Map(
      (existingRisks ?? []).map((r: any) => [r.subscriber_id, r])
    );

    const results: any[] = [];
    let savedCount = 0;
    const tierCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const sub of subscribers ?? []) {
      const engagement = sub.engagement_data as any ?? {};
      const emailsSent = engagement.emails_sent ?? 0;
      const emailsOpened = engagement.emails_opened ?? 0;
      const emailsClicked = engagement.emails_clicked ?? 0;

      if (emailsSent < 3) continue;

      const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
      const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;

      const lastOpen = engagement.last_email_opened_at
        ? Math.floor((Date.now() - new Date(engagement.last_email_opened_at).getTime()) / 86400000)
        : null;
      const lastClick = engagement.last_clicked_at
        ? Math.floor((Date.now() - new Date(engagement.last_clicked_at).getTime()) / 86400000)
        : null;

      const decliningOpens = openRate < 20;
      const decliningClicks = clickRate < 5;

      // Risk score (0-100)
      let riskScore = 0;
      if (openRate < 10) riskScore += 30;
      else if (openRate < 20) riskScore += 20;
      else if (openRate < 30) riskScore += 10;

      if (clickRate < 2) riskScore += 20;
      else if (clickRate < 5) riskScore += 10;

      if (lastOpen !== null) {
        if (lastOpen > 60) riskScore += 30;
        else if (lastOpen > 30) riskScore += 20;
        else if (lastOpen > 14) riskScore += 10;
      } else {
        riskScore += 25;
      }

      if (sub.engagement_score < 25) riskScore += 20;
      else if (sub.engagement_score < 50) riskScore += 10;

      riskScore = Math.min(riskScore, 100);

      const riskLevel =
        riskScore >= THRESHOLDS.critical.min ? "critical" :
        riskScore >= THRESHOLDS.high.min ? "high" :
        riskScore >= THRESHOLDS.medium.min ? "medium" :
        riskScore >= THRESHOLDS.low.min ? "low" : "none";

      if (riskLevel === "none") continue;

      tierCounts[riskLevel as keyof typeof tierCounts]++;

      // Check if subscriber was previously at risk and has improved (saved)
      const prev = existingMap.get(sub.id);
      let isSaved = false;
      let savedAt: string | null = null;

      if (prev && prev.journey_tier !== "none" && prev.journey_started_at) {
        // If risk dropped significantly after journey started, mark as saved
        if (riskScore < prev.risk_score - 15 && openRate > (prev.pre_journey_open_rate ?? 0) + 5) {
          isSaved = true;
          savedAt = new Date().toISOString();
          savedCount++;
        }
      }

      // Auto-assign journey tier
      const journeyTier = riskLevel;
      const shouldStartJourney = !prev?.journey_started_at || prev.saved;

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
        journey_tier: journeyTier,
        journey_started_at: shouldStartJourney ? new Date().toISOString() : prev?.journey_started_at,
        saved: isSaved,
        saved_at: isSaved ? savedAt : null,
        pre_journey_open_rate: shouldStartJourney ? openRate : (prev?.pre_journey_open_rate ?? openRate),
        post_journey_open_rate: openRate,
        reengagement_status: shouldStartJourney ? "enrolled" : (isSaved ? "completed" : "in_progress"),
      });
    }

    // Upsert churn risk records
    if (results.length > 0) {
      const { error: upsertError } = await supabase
        .from("subscriber_churn_risk")
        .upsert(results, { onConflict: "workspace_id,subscriber_id" });
      if (upsertError) throw upsertError;
    }

    // Record recovery outcome snapshot
    const today = new Date().toISOString().slice(0, 10);
    const totalSaved = results.filter(r => r.saved).length + savedCount;
    const totalLost = results.filter(r => r.risk_level === "critical" && !r.saved).length;

    await supabase.from("churn_recovery_outcomes").upsert({
      workspace_id,
      period_start: today,
      period_end: today,
      total_at_risk: results.length,
      low_risk_count: tierCounts.low,
      medium_risk_count: tierCounts.medium,
      high_risk_count: tierCounts.high,
      critical_risk_count: tierCounts.critical,
      journeys_triggered: results.filter(r => r.reengagement_status === "enrolled").length,
      journeys_completed: results.filter(r => r.reengagement_status === "completed").length,
      subscribers_saved: totalSaved,
      subscribers_lost: totalLost,
      saved_rate: results.length > 0 ? Math.round((totalSaved / results.length) * 10000) / 100 : 0,
      incremental_retained: totalSaved,
    }, { onConflict: "workspace_id,period_start,period_end" });

    return new Response(
      JSON.stringify({
        processed: (subscribers ?? []).length,
        at_risk: results.length,
        tiers: tierCounts,
        saved: totalSaved,
        journeys_triggered: results.filter(r => r.reengagement_status === "enrolled").length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Churn detection error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

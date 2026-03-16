import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get all active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, engagement_data, created_at")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (subError) throw subError;

    let updated = 0;
    const now = new Date();

    for (const sub of (subscribers || [])) {
      const data = sub.engagement_data || {};
      const emailsSent = data.emails_sent || 0;
      const emailsOpened = data.emails_opened || 0;
      const emailsClicked = data.emails_clicked || 0;
      const guidesDownloaded = data.guides_downloaded || 0;

      // Recency score (0-30): how recently they interacted
      let recencyScore = 0;
      const lastActivity = data.last_email_opened_at || data.last_clicked_at;
      if (lastActivity) {
        const daysSince = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= 7) recencyScore = 30;
        else if (daysSince <= 14) recencyScore = 25;
        else if (daysSince <= 30) recencyScore = 20;
        else if (daysSince <= 60) recencyScore = 10;
        else recencyScore = 5;
      }

      // Email engagement (0-30): open + click rates
      let emailScore = 0;
      if (emailsSent > 0) {
        const openRate = emailsOpened / emailsSent;
        const clickRate = emailsClicked / emailsSent;
        emailScore = Math.min(30, Math.round(openRate * 20 + clickRate * 20));
      }

      // Guide downloads (0-20)
      const guideScore = Math.min(20, guidesDownloaded * 10);

      // Tenure bonus (0-20): longer subscribers get a small bonus
      const subscribedDays = Math.floor((now.getTime() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24));
      let tenureScore = 0;
      if (subscribedDays >= 90) tenureScore = 20;
      else if (subscribedDays >= 60) tenureScore = 15;
      else if (subscribedDays >= 30) tenureScore = 10;
      else if (subscribedDays >= 7) tenureScore = 5;

      const totalScore = Math.min(100, recencyScore + emailScore + guideScore + tenureScore);

      // Update subscriber
      const { error: updateError } = await supabase
        .from("subscribers")
        .update({ engagement_score: totalScore })
        .eq("id", sub.id);

      if (!updateError) updated++;
    }

    return new Response(
      JSON.stringify({ success: true, updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

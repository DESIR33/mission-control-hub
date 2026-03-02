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

    // Get all contacts
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, email, last_contact_date, social_links, custom_fields")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null);

    if (!contacts?.length) {
      return new Response(
        JSON.stringify({ success: true, updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all deals for avg value calculation
    const { data: allDeals } = await supabase
      .from("deals")
      .select("id, contact_id, stage, value")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null);

    const deals = allDeals || [];
    const avgDealValue =
      deals.length > 0
        ? deals.reduce((s, d) => s + (d.value || 0), 0) / deals.length
        : 0;

    // Get email reply events
    const { data: replyEvents } = await supabase
      .from("sequence_step_events")
      .select("enrollment_id")
      .eq("event_type", "replied");

    // Get enrollments to map to contacts
    const { data: enrollments } = await supabase
      .from("email_sequence_enrollments")
      .select("id, contact_id")
      .eq("workspace_id", workspace_id);

    // Build contact → replied set
    const repliedContacts = new Set<string>();
    if (replyEvents && enrollments) {
      const enrollmentContactMap = new Map<string, string>();
      for (const e of enrollments) {
        enrollmentContactMap.set(e.id, e.contact_id);
      }
      for (const re of replyEvents) {
        const contactId = enrollmentContactMap.get(re.enrollment_id);
        if (contactId) repliedContacts.add(contactId);
      }
    }

    let updated = 0;

    for (const contact of contacts) {
      let score = 0;

      // 1. Email response (25pts)
      if (repliedContacts.has(contact.id)) {
        score += 25;
      }

      // 2. Deal conversion (20pts)
      const contactDeals = deals.filter((d) => d.contact_id === contact.id);
      const hasWonDeal = contactDeals.some((d) => d.stage === "closed_won");
      if (hasWonDeal) {
        score += 20;
      }

      // 3. Recency (20pts)
      if (contact.last_contact_date) {
        const daysSinceContact = Math.floor(
          (Date.now() - new Date(contact.last_contact_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact <= 7) score += 20;
        else if (daysSinceContact <= 14) score += 15;
        else if (daysSinceContact <= 30) score += 10;
        else if (daysSinceContact <= 60) score += 5;
      }

      // 4. Deal value (15pts)
      const contactDealValue = contactDeals.reduce((s, d) => s + (d.value || 0), 0);
      if (avgDealValue > 0 && contactDealValue >= avgDealValue) {
        score += 15;
      } else if (avgDealValue > 0 && contactDealValue >= avgDealValue * 0.5) {
        score += 8;
      }

      // 5. Social presence (10pts)
      const socialLinks = contact.social_links || {};
      let socialCount = 0;
      if (socialLinks.youtube) socialCount++;
      if (socialLinks.linkedin) socialCount++;
      if (socialLinks.twitter) socialCount++;
      if (socialLinks.instagram) socialCount++;
      score += Math.min(socialCount * 3, 10);

      // 6. Referral (10pts)
      const customFields = contact.custom_fields || {};
      if (customFields.referral_source || customFields.referred_by) {
        score += 10;
      }

      // Clamp to 0-100
      score = Math.max(0, Math.min(100, score));

      await supabase
        .from("contacts")
        .update({ engagement_score: score })
        .eq("id", contact.id);

      updated++;
    }

    return new Response(
      JSON.stringify({ success: true, updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

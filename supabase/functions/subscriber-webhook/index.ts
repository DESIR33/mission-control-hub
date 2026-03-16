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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, email, first_name, last_name, source, source_video_id, source_video_title, guide_requested } = await req.json();

    if (!workspace_id) throw new Error("Missing workspace_id");
    if (!email) throw new Error("Missing email");

    // Upsert subscriber (deduplicate by email within workspace)
    const { data: existing } = await supabase
      .from("subscribers")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("email", email)
      .is("deleted_at", null)
      .maybeSingle();

    let subscriberId: string;

    if (existing) {
      // Update existing subscriber with new info
      const { data, error } = await supabase
        .from("subscribers")
        .update({
          first_name: first_name || undefined,
          last_name: last_name || undefined,
          source_video_id: source_video_id || undefined,
          source_video_title: source_video_title || undefined,
          guide_requested: guide_requested || undefined,
          status: "active",
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) throw error;
      subscriberId = data.id;
    } else {
      // Create new subscriber
      const { data, error } = await supabase
        .from("subscribers")
        .insert({
          workspace_id,
          email,
          first_name: first_name || null,
          last_name: last_name || null,
          source: source || "website",
          source_video_id: source_video_id || null,
          source_video_title: source_video_title || null,
          guide_requested: guide_requested || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      subscriberId = data.id;
    }

    // If guide_requested, trigger guide delivery
    if (guide_requested) {
      try {
        await supabase.functions.invoke("deliver-guide", {
          body: { workspace_id, subscriber_id: subscriberId, guide_slug: guide_requested },
        });
      } catch (err) {
        console.error("Guide delivery failed:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, subscriber_id: subscriberId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

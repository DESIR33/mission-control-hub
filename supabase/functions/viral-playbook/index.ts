import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VIRAL_THRESHOLD = 75;

const DEFAULT_CHECKLIST = [
  { step_order: 1, title: "Pin top comment", category: "engagement", description: "Pin the AI-generated conversion comment to maximize visibility" },
  { step_order: 2, title: "Update video description", category: "seo", description: "Add trending keywords and CTAs to description" },
  { step_order: 3, title: "Draft newsletter issue", category: "newsletter", description: "Send a newsletter blast featuring this video" },
  { step_order: 4, title: "Post social snippets", category: "social", description: "Share clips and quotes across social platforms" },
  { step_order: 5, title: "Add end screen cards", category: "engagement", description: "Link to related content and subscribe CTA" },
  { step_order: 6, title: "Create community post", category: "social", description: "Engage subscribers with a follow-up community post" },
  { step_order: 7, title: "Track sponsor mentions", category: "revenue", description: "Ensure sponsor deliverables are highlighted during peak traffic" },
  { step_order: 8, title: "Monitor comments", category: "engagement", description: "Respond to top comments within 2 hours of viral window" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, video_id, video_title, viral_score, views, subs } = await req.json();
    if (!workspace_id || !video_id) {
      return new Response(JSON.stringify({ error: "workspace_id and video_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const score = viral_score ?? 0;
    if (score < VIRAL_THRESHOLD) {
      return new Response(JSON.stringify({ triggered: false, reason: `Score ${score} below threshold ${VIRAL_THRESHOLD}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing active run
    const { data: existingRun } = await supabase
      .from("viral_playbook_runs")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("youtube_video_id", video_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingRun) {
      return new Response(JSON.stringify({ triggered: false, reason: "Active run already exists", run_id: existingRun.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create playbook run
    const { data: run, error: runError } = await supabase
      .from("viral_playbook_runs")
      .insert({
        workspace_id,
        youtube_video_id: video_id,
        video_title: video_title ?? "",
        viral_score: score,
        trigger_reason: score >= 85 ? "viral" : "trending",
        views_at_trigger: views ?? 0,
        subs_at_trigger: subs ?? 0,
      })
      .select("id")
      .single();

    if (runError) throw runError;

    // Insert checklist
    const checklistItems = DEFAULT_CHECKLIST.map((item) => ({
      ...item,
      run_id: run.id,
      workspace_id,
      auto_generated: true,
    }));

    await supabase.from("viral_playbook_checklist").insert(checklistItems);

    // Generate conversion assets via AI
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const assets: any[] = [];

    if (openRouterKey) {
      const prompt = `A YouTube video titled "${video_title}" is going viral (score: ${score}/100, ${views} views).

Generate 4 conversion assets as JSON array. Each object must have:
- "asset_type": one of "pinned_comment", "description_update", "newsletter_draft", "social_snippet"  
- "title": short asset title
- "content": the full ready-to-use text

For pinned_comment: Write an engaging comment that drives subscribers, includes a CTA.
For description_update: Write optimized description additions with trending keywords, links placeholder, and CTA.
For newsletter_draft: Write a short email subject + body featuring this video for subscribers.
For social_snippet: Write 3 platform-specific posts (Twitter, LinkedIn, Instagram) separated by ---

Return ONLY the JSON array, no markdown.`;

      try {
        const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { role: "system", content: "You generate YouTube conversion assets. Return only valid JSON arrays." },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const raw = aiData.choices?.[0]?.message?.content ?? "[]";
          // Extract JSON from potential markdown
          const jsonMatch = raw.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            for (const asset of parsed) {
              assets.push({
                run_id: run.id,
                workspace_id,
                asset_type: asset.asset_type,
                title: asset.title,
                content: asset.content,
                status: "draft",
              });
            }
          }
        }
      } catch (aiErr) {
        console.error("AI generation error (non-fatal):", aiErr);
      }
    }

    // Fallback: create placeholder assets if AI failed
    if (assets.length === 0) {
      const types = ["pinned_comment", "description_update", "newsletter_draft", "social_snippet"];
      for (const t of types) {
        assets.push({
          run_id: run.id,
          workspace_id,
          asset_type: t,
          title: `${t.replace(/_/g, " ")} for "${video_title}"`,
          content: `[Draft ${t.replace(/_/g, " ")} — edit before publishing]`,
          status: "draft",
        });
      }
    }

    if (assets.length > 0) {
      await supabase.from("viral_conversion_assets").insert(assets);
    }

    return new Response(
      JSON.stringify({
        triggered: true,
        run_id: run.id,
        assets_generated: assets.length,
        checklist_items: checklistItems.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Viral playbook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

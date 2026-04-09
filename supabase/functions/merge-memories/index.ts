import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workspace_id, member_ids, action } = await req.json();

    if (!workspace_id || !member_ids || !Array.isArray(member_ids) || member_ids.length < 2) {
      return new Response(
        JSON.stringify({ error: "workspace_id and member_ids (≥2) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the member memories
    const { data: members, error: fetchErr } = await supabase
      .from("assistant_memory")
      .select("id, content, confidence_score, agent_id, tags, memory_type, importance_score")
      .eq("workspace_id", workspace_id)
      .in("id", member_ids);

    if (fetchErr) throw fetchErr;
    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ error: "No memories found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "keep_separate") {
      // No merge — just acknowledge
      return new Response(
        JSON.stringify({ status: "kept_separate", count: members.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pick_canonical") {
      const { canonical_id } = await req.json().catch(() => ({}));
      // canonical_id should be passed; archive the rest
      const toArchive = member_ids.filter((id: string) => id !== (canonical_id || member_ids[0]));
      if (toArchive.length > 0) {
        const { error: archErr } = await supabase
          .from("assistant_memory")
          .update({ status: "archived" })
          .in("id", toArchive);
        if (archErr) throw archErr;
      }
      return new Response(
        JSON.stringify({ status: "canonical_picked", archived: toArchive.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: auto_merge — send to AI for consolidation
    const memberTexts = members
      .map((m: any, i: number) => `[${i + 1}] ${m.content}`)
      .join("\n");

    const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.7",
        messages: [
          {
            role: "system",
            content: `You are a memory consolidation engine. Given multiple overlapping memories, produce ONE canonical memory that preserves all unique facts. Return JSON: {"content": "...", "confidence": 0.95, "tags": ["..."]}`,
          },
          {
            role: "user",
            content: `Consolidate these ${members.length} overlapping memories into one:\n\n${memberTexts}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenRouter error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI merge failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    let merged: { content: string; confidence: number; tags: string[] };
    try {
      merged = JSON.parse(raw);
    } catch {
      merged = { content: raw, confidence: 0.8, tags: [] };
    }

    // Collect all unique tags from originals + AI result
    const allTags = [
      ...new Set([
        ...(merged.tags || []),
        ...members.flatMap((m: any) => m.tags || []),
      ]),
    ];

    // Insert the canonical memory
    const { data: inserted, error: insErr } = await supabase
      .from("assistant_memory")
      .insert({
        workspace_id,
        content: merged.content || members[0].content,
        confidence_score: Math.min(1, merged.confidence || 0.9),
        tags: allTags,
        origin: "auto_merged",
        memory_type: members[0].memory_type || "semantic",
        importance_score: Math.max(...members.map((m: any) => m.importance_score || 0.5)),
        review_status: "approved",
        status: "active",
        agent_id: members[0].agent_id || "global",
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    // Archive originals
    const { error: archErr } = await supabase
      .from("assistant_memory")
      .update({ status: "archived" })
      .in("id", member_ids);

    if (archErr) throw archErr;

    return new Response(
      JSON.stringify({
        status: "merged",
        new_memory_id: inserted?.id,
        archived_count: member_ids.length,
        content: merged.content,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("merge-memories error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

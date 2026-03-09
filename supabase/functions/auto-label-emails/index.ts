import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, email_ids } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    // Get auto-label rules
    const { data: rules } = await supabase
      .from("email_auto_labels")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    if (!rules?.length) {
      return new Response(JSON.stringify({ message: "No active auto-label rules", labeled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unlabeled emails
    let emailQuery = supabase
      .from("inbox_emails")
      .select("id, subject, from_name, from_email, preview")
      .eq("workspace_id", workspace_id)
      .eq("folder", "inbox")
      .order("received_at", { ascending: false })
      .limit(50);

    if (email_ids?.length) {
      emailQuery = emailQuery.in("id", email_ids);
    }

    const { data: emails } = await emailQuery;
    if (!emails?.length) {
      return new Response(JSON.stringify({ message: "No emails to label", labeled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the classification prompt
    const rulesDescription = rules.map((r: any) => 
      `Label: "${r.label_name}" — Rule: ${r.natural_language_rule}`
    ).join("\n");

    const emailDescriptions = emails.map((e: any, i: number) => 
      `[${i}] From: ${e.from_name} <${e.from_email}> | Subject: ${e.subject} | Preview: ${e.preview?.slice(0, 100)}`
    ).join("\n");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.5",
        messages: [
          {
            role: "system",
            content: "You are an email classification AI. Given label rules and emails, assign labels. Return JSON array of objects: [{\"index\": 0, \"labels\": [\"Label1\"]}]. An email can have multiple labels or none. Only assign labels whose rules match.",
          },
          {
            role: "user",
            content: `LABEL RULES:\n${rulesDescription}\n\nEMAILS:\n${emailDescriptions}\n\nClassify each email. Return ONLY valid JSON array.`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    let classifications: Array<{ index: number; labels: string[] }> = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) classifications = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse classification:", content);
    }

    let labeled = 0;
    for (const cls of classifications) {
      if (cls.labels?.length > 0 && emails[cls.index]) {
        const email = emails[cls.index];
        const existingLabels = (email as any).labels || [];
        const newLabels = [...new Set([...existingLabels, ...cls.labels])];
        
        await supabase
          .from("inbox_emails")
          .update({ labels: newLabels })
          .eq("id", email.id);
        labeled++;
      }
    }

    return new Response(JSON.stringify({ success: true, labeled, total: emails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-label error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

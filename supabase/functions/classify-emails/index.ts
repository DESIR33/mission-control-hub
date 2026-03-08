import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { workspace_id, emails } = await req.json();
    if (!workspace_id || !emails?.length) {
      return new Response(JSON.stringify({ classified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) throw new Error("OPENROUTER_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process in batches of 20
    const batchSize = 20;
    let totalClassified = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const emailList = batch
        .map(
          (e: any, idx: number) =>
            `${idx + 1}. From: ${e.from_name} <${e.from_email}> | Subject: ${e.subject} | Preview: ${(e.preview || "").substring(0, 100)}`
        )
        .join("\n");

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "minimax/minimax-m2.5",
            messages: [
              {
                role: "system",
                content: `You are an email classifier. Classify each email into exactly one category:
- "opportunity" = sponsorship inquiries, business proposals, collaboration requests, partnership offers, deals
- "marketing" = promotional emails, product announcements, sales pitches from companies
- "newsletter" = recurring newsletters, digests, updates from subscriptions
- "spam" = unsolicited junk, phishing, irrelevant bulk mail

Respond with ONLY a JSON array of objects: [{"index": 1, "category": "opportunity", "summary": "Brief 1-line summary"}]
No other text.`,
              },
              {
                role: "user",
                content: `Classify these emails:\n${emailList}`,
              },
            ],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        }
      );

      if (!response.ok) {
        console.error("OpenRouter error:", await response.text());
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "[]";

      let classifications: Array<{
        index: number;
        category: string;
        summary: string;
      }>;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        console.error("Failed to parse classifications:", content);
        continue;
      }

      // Update each email
      for (const c of classifications) {
        const email = batch[c.index - 1];
        if (!email) continue;

        const validCategories = [
          "marketing",
          "opportunity",
          "spam",
          "newsletter",
        ];
        const category = validCategories.includes(c.category)
          ? c.category
          : "marketing";

        const { error } = await supabase
          .from("inbox_emails")
          .update({
            ai_category: category,
            ai_summary: c.summary || null,
          })
          .eq("id", email.id);

        if (!error) totalClassified++;
      }
    }

    return new Response(
      JSON.stringify({ classified: totalClassified }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("classify-emails error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

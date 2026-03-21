import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";
import { getIntegrationConfig } from "../_shared/supabase-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { workspace_id, expense_id, title, amount, vendor, category, additional_context } = body;

    if (!workspace_id || !expense_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or expense_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authResult = await validateCallerOrServiceRole(req, workspace_id);
    if (!authResult.authorized) {
      return (authResult as any).response;
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get OpenRouter config
    const orConfig = await getIntegrationConfig(adminClient, workspace_id, "openrouter");
    const apiKey = orConfig?.api_key || Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenRouter API key not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch past expense patterns for learning
    const { data: pastExpenses } = await adminClient
      .from("expenses")
      .select("title, vendor, category_id, is_tax_deductible, tax_deductible_reason, tax_review_status")
      .eq("workspace_id", workspace_id)
      .eq("tax_review_status", "reviewed")
      .order("created_at", { ascending: false })
      .limit(50);

    const pastContext = (pastExpenses || [])
      .map(e => `- "${e.title}" (vendor: ${e.vendor || "N/A"}): ${e.is_tax_deductible ? "DEDUCTIBLE" : "NOT DEDUCTIBLE"} — ${e.tax_deductible_reason || "no reason"}`)
      .join("\n");

    const systemPrompt = `You are a tax deductibility expert for content creators and small business owners. 
Your job is to assess whether business expenses are likely tax deductible in the US.

You have access to this user's past expense classifications to learn their patterns:
${pastContext || "No past classifications yet."}

Rules:
- Be helpful but clear this is NOT tax advice — recommend consulting a CPA for final decisions
- Consider common creator/freelancer deductions: home office, equipment, software, travel for business, education related to business
- If unsure, ask clarifying questions
- Return confidence as a decimal 0-1

Return a JSON object with these fields:
{
  "is_deductible": boolean,
  "confidence": number (0-1),
  "reason": "Brief explanation of why this is/isn't likely deductible",
  "category_suggestion": "IRS category like 'Office Expenses', 'Business Travel', etc.",
  "follow_up_questions": ["question1", "question2"] // 0-3 questions if you need more info
}`;

    const userMessage = `Expense to review:
- Title: ${title}
- Amount: $${amount}
- Vendor: ${vendor || "Not specified"}
- Category: ${category || "Uncategorized"}
${additional_context ? `\nAdditional context from user:\n${additional_context}` : ""}

Is this expense tax deductible? Return JSON only.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        is_deductible: false,
        confidence: 0.3,
        reason: content || "Could not parse AI response",
        category_suggestion: "",
        follow_up_questions: [],
      };
    }

    // Update expense with AI assessment
    await adminClient
      .from("expenses")
      .update({
        is_tax_deductible: result.is_deductible,
        tax_deductible_reason: result.reason,
        tax_review_status: "reviewed",
      })
      .eq("id", expense_id)
      .eq("workspace_id", workspace_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Tax review error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

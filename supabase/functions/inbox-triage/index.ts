import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

/**
 * Enhanced inbox triage: categorizes emails with priority, intent,
 * and suggested actions. Upgrades the basic classify-emails function.
 * 
 * Categories: sponsor_inquiry, partnership_request, fan_mail, newsletter, marketing, spam
 * Priority: P1 (urgent), P2 (important), P3 (normal), P4 (low)
 * Intent: action_required, fyi, follow_up, reply_needed, archive
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const auth = await validateCallerOrServiceRole(req);
    if (!auth.authorized) return auth.response;

    const { workspace_id, limit: emailLimit } = await req.json();
    if (!workspace_id) return jsonResponse({ error: "workspace_id required" }, 400);

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) return errorResponse("OPENROUTER_API_KEY not set", 500);

    const sb = getSupabaseAdmin();

    // Fetch untriaged emails (no ai_priority set yet)
    const { data: emails } = await sb
      .from("inbox_emails")
      .select("id, from_name, from_email, subject, preview, folder")
      .eq("workspace_id", workspace_id)
      .is("ai_priority", null)
      .in("folder", ["inbox", "INBOX"])
      .order("received_at", { ascending: false })
      .limit(emailLimit || 30);

    if (!emails?.length) return jsonResponse({ triaged: 0 });

    // Fetch CRM contacts for context matching
    const { data: contacts } = await sb
      .from("contacts")
      .select("email, first_name, last_name, status, vip_tier")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null);

    const contactEmails = new Set((contacts ?? []).map((c: any) => c.email?.toLowerCase()).filter(Boolean));
    const vipEmails = new Set(
      (contacts ?? []).filter((c: any) => c.vip_tier).map((c: any) => c.email?.toLowerCase()).filter(Boolean)
    );

    // Process in batches of 15
    const batchSize = 15;
    let totalTriaged = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const emailList = batch.map((e: any, idx: number) => {
        const isKnown = contactEmails.has(e.from_email?.toLowerCase());
        const isVip = vipEmails.has(e.from_email?.toLowerCase());
        return `${idx + 1}. From: ${e.from_name} <${e.from_email}>${isKnown ? " [CRM CONTACT]" : ""}${isVip ? " [VIP]" : ""} | Subject: ${e.subject} | Preview: ${(e.preview || "").substring(0, 150)}`;
      }).join("\n");

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
              content: `You are an inbox triage assistant for a YouTube creator/entrepreneur. Classify each email with:

1. category: "sponsor_inquiry" | "partnership_request" | "fan_mail" | "newsletter" | "marketing" | "spam"
2. priority: "P1" (urgent/revenue opportunity) | "P2" (important/time-sensitive) | "P3" (normal) | "P4" (low/can ignore)
3. intent: "action_required" | "reply_needed" | "follow_up" | "fyi" | "archive"
4. suggested_action: A brief 1-sentence action recommendation

Rules:
- Emails from [CRM CONTACT] or [VIP] should be at least P2
- Sponsor inquiries and partnership requests are always P1 or P2
- Newsletters and marketing are P3-P4
- Spam is always P4 with intent "archive"

Respond with ONLY a JSON array: [{"index": 1, "category": "sponsor_inquiry", "priority": "P1", "intent": "reply_needed", "suggested_action": "Reply with rate card and availability"}]`,
            },
            { role: "user", content: `Triage these emails:\n${emailList}` },
          ],
          temperature: 0.1,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        console.error("OpenRouter error:", await response.text());
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || "[]";

      let classifications: any[];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        console.error("Failed to parse triage:", content);
        continue;
      }

      for (const c of classifications) {
        const email = batch[c.index - 1];
        if (!email) continue;

        const validCategories = ["sponsor_inquiry", "partnership_request", "fan_mail", "newsletter", "marketing", "spam"];
        const validPriorities = ["P1", "P2", "P3", "P4"];

        await sb.from("inbox_emails").update({
          ai_category: validCategories.includes(c.category) ? c.category : "marketing",
          ai_priority: validPriorities.includes(c.priority) ? c.priority : "P3",
          ai_intent: c.intent || "fyi",
          ai_suggested_action: c.suggested_action || null,
          ai_summary: c.suggested_action || null,
        }).eq("id", email.id);

        totalTriaged++;
      }
    }

    // Log the triage action
    await sb.from("assistant_actions").insert({
      workspace_id,
      action_type: "inbox_triage",
      title: `Triaged ${totalTriaged} emails`,
      description: `Categorized and prioritized ${totalTriaged} inbox emails with AI.`,
      metadata: { email_count: totalTriaged },
    });

    return jsonResponse({ triaged: totalTriaged });
  } catch (e: unknown) {
    console.error("inbox-triage error:", e);
    return errorResponse(e, 500);
  }
});

import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

/**
 * Enhanced inbox triage: categorizes emails with priority, intent,
 * suggested actions, AND route actions (create contact, create deal, etc.)
 * with confidence scoring. High-confidence actions auto-execute;
 * low-confidence actions go to approval queue.
 */

const AUTO_EXECUTE_THRESHOLD = 80;

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

    if (!emails?.length) return jsonResponse({ triaged: 0, route_actions: 0 });

    // Fetch CRM contacts for context matching
    const { data: contacts } = await sb
      .from("contacts")
      .select("id, email, first_name, last_name, status, vip_tier, company_id")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null);

    const contactMap = new Map<string, any>();
    for (const c of (contacts ?? []) as any[]) {
      if (c.email) contactMap.set(c.email.toLowerCase(), c);
    }

    // Fetch active sequences for enrollment suggestions
    const { data: sequences } = await sb
      .from("email_sequences")
      .select("id, name")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .limit(10);

    const sequenceList = (sequences ?? []).map((s: any) => `${s.name} (id: ${s.id})`).join(", ");

    // Process in batches of 15
    const batchSize = 15;
    let totalTriaged = 0;
    let totalRouteActions = 0;
    let autoExecuted = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const emailList = batch.map((e: any, idx: number) => {
        const contact = contactMap.get(e.from_email?.toLowerCase());
        const flags = [];
        if (contact) flags.push("[CRM CONTACT]");
        if (contact?.vip_tier) flags.push("[VIP]");
        return `${idx + 1}. From: ${e.from_name} <${e.from_email}>${flags.join(" ")} | Subject: ${e.subject} | Preview: ${(e.preview || "").substring(0, 200)}`;
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
              content: `You are an inbox triage assistant for a YouTube creator/entrepreneur. For each email, produce:

1. category: "sponsor_inquiry" | "partnership_request" | "fan_mail" | "newsletter" | "marketing" | "spam"
2. priority: "P1" (urgent/revenue) | "P2" (important) | "P3" (normal) | "P4" (low)
3. intent: "action_required" | "reply_needed" | "follow_up" | "fyi" | "archive"
4. suggested_action: Brief 1-sentence action
5. route_actions: Array of automated actions to take. Each action has:
   - type: "create_contact" | "update_contact" | "create_deal" | "schedule_followup" | "enroll_sequence"
   - confidence: 0-100 (how certain you are this action should be taken)
   - payload: object with action-specific data
   - rationale: why this action is recommended

Action payload formats:
- create_contact: { first_name, last_name, email, company_name, role }
- update_contact: { contact_email, updates: { status?, vip_tier?, notes? } }
- create_deal: { title, value_estimate, company_name, contact_email, stage: "prospecting" }
- schedule_followup: { contact_email, days_from_now, reason }
- enroll_sequence: { contact_email, sequence_id, reason }

Rules:
- [CRM CONTACT]/[VIP] emails: at least P2. For VIPs, suggest update_contact if relevant.
- Sponsor inquiries → create_deal (confidence 70-95 based on specificity of inquiry)
- Unknown senders with business emails → create_contact (confidence 60-90)
- Partnership requests → create_deal + schedule_followup
- If sender is already a contact, DON'T suggest create_contact
- Spam/newsletter → no route_actions
- Be conservative with confidence: only 85+ if very clear intent${sequenceList ? `\n\nAvailable sequences for enrollment: ${sequenceList}` : ""}

Return ONLY JSON array: [{"index": 1, "category": "...", "priority": "...", "intent": "...", "suggested_action": "...", "route_actions": [...]}]`,
            },
            { role: "user", content: `Triage these emails:\n${emailList}` },
          ],
          temperature: 0.1,
          max_tokens: 5000,
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

        // Process route actions
        const routeActions = c.route_actions ?? [];
        for (const action of routeActions) {
          if (!action.type || action.confidence == null) continue;

          const validTypes = ["create_contact", "update_contact", "create_deal", "schedule_followup", "enroll_sequence"];
          if (!validTypes.includes(action.type)) continue;

          const confidence = Math.max(0, Math.min(100, Number(action.confidence)));
          const shouldAutoExecute = confidence >= AUTO_EXECUTE_THRESHOLD;

          // Insert route action record
          const { data: routeAction } = await sb.from("inbox_route_actions").insert({
            workspace_id,
            email_id: email.id,
            action_type: action.type,
            confidence,
            status: shouldAutoExecute ? "auto_executed" : "pending",
            payload: action.payload || {},
            rationale: action.rationale || null,
            resolved_at: shouldAutoExecute ? new Date().toISOString() : null,
          }).select("id").single();

          totalRouteActions++;

          // Auto-execute high-confidence actions
          if (shouldAutoExecute && routeAction) {
            try {
              const resultId = await executeRouteAction(sb, workspace_id, action.type, action.payload || {});
              if (resultId) {
                await sb.from("inbox_route_actions").update({
                  result_entity_id: resultId,
                }).eq("id", routeAction.id);
              }
              autoExecuted++;
            } catch (execErr) {
              console.error(`Auto-execute failed for ${action.type}:`, execErr);
              // Downgrade to pending if execution fails
              await sb.from("inbox_route_actions").update({
                status: "pending",
                resolved_at: null,
              }).eq("id", routeAction.id);
            }
          }
        }
      }
    }

    // Log the triage action
    await sb.from("assistant_actions").insert({
      workspace_id,
      action_type: "inbox_triage",
      title: `Triaged ${totalTriaged} emails, ${totalRouteActions} route actions`,
      description: `Categorized ${totalTriaged} emails. Generated ${totalRouteActions} route actions (${autoExecuted} auto-executed, ${totalRouteActions - autoExecuted} pending approval).`,
      metadata: { email_count: totalTriaged, route_actions: totalRouteActions, auto_executed: autoExecuted },
    });

    return jsonResponse({ triaged: totalTriaged, route_actions: totalRouteActions, auto_executed: autoExecuted });
  } catch (e: unknown) {
    console.error("inbox-triage error:", e);
    return errorResponse(e, 500);
  }
});

async function executeRouteAction(sb: any, workspaceId: string, actionType: string, payload: any): Promise<string | null> {
  switch (actionType) {
    case "create_contact": {
      const { data, error } = await sb.from("contacts").insert({
        workspace_id: workspaceId,
        first_name: payload.first_name || "Unknown",
        last_name: payload.last_name || null,
        email: payload.email,
        role: payload.role || null,
        source: "inbox_triage",
        status: "active",
      }).select("id").single();
      if (error) throw error;

      // Try to link to company if company_name provided
      if (payload.company_name && data?.id) {
        const { data: company } = await sb.from("companies")
          .select("id")
          .eq("workspace_id", workspaceId)
          .ilike("name", payload.company_name)
          .is("deleted_at", null)
          .maybeSingle();
        if (company) {
          await sb.from("contacts").update({ company_id: company.id }).eq("id", data.id);
        }
      }
      return data?.id ?? null;
    }

    case "update_contact": {
      if (!payload.contact_email || !payload.updates) return null;
      const { data: contact } = await sb.from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", payload.contact_email)
        .is("deleted_at", null)
        .maybeSingle();
      if (!contact) return null;

      const updates: any = {};
      if (payload.updates.status) updates.status = payload.updates.status;
      if (payload.updates.vip_tier) updates.vip_tier = payload.updates.vip_tier;
      if (payload.updates.notes) updates.notes = payload.updates.notes;
      updates.updated_at = new Date().toISOString();

      await sb.from("contacts").update(updates).eq("id", contact.id);
      return contact.id;
    }

    case "create_deal": {
      // Find or reference company
      let companyId = null;
      if (payload.company_name) {
        const { data: company } = await sb.from("companies")
          .select("id")
          .eq("workspace_id", workspaceId)
          .ilike("name", payload.company_name)
          .is("deleted_at", null)
          .maybeSingle();
        companyId = company?.id ?? null;
      }

      // Find contact
      let contactId = null;
      if (payload.contact_email) {
        const { data: contact } = await sb.from("contacts")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("email", payload.contact_email)
          .is("deleted_at", null)
          .maybeSingle();
        contactId = contact?.id ?? null;
      }

      const { data, error } = await sb.from("deals").insert({
        workspace_id: workspaceId,
        title: payload.title || "Untitled Deal",
        value: payload.value_estimate ? Number(payload.value_estimate) : null,
        stage: payload.stage || "prospecting",
        company_id: companyId,
        contact_id: contactId,
        notes: `Auto-created from inbox triage`,
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }

    case "schedule_followup": {
      // Create a task as follow-up reminder
      const daysFromNow = payload.days_from_now ?? 3;
      const dueDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await sb.from("tasks").insert({
        workspace_id: workspaceId,
        title: `Follow up: ${payload.reason || payload.contact_email}`,
        description: payload.reason || `Follow up with ${payload.contact_email}`,
        status: "todo",
        due_date: dueDate,
        priority: "medium",
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }

    case "enroll_sequence": {
      if (!payload.sequence_id || !payload.contact_email) return null;

      const { data: contact } = await sb.from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", payload.contact_email)
        .is("deleted_at", null)
        .maybeSingle();
      if (!contact) return null;

      const { data, error } = await sb.from("email_sequence_enrollments").insert({
        workspace_id: workspaceId,
        sequence_id: payload.sequence_id,
        contact_id: contact.id,
        status: "active",
        current_step: 0,
        next_send_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }

    default:
      return null;
  }
}

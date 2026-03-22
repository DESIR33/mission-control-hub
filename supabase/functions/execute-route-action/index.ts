import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

/**
 * Execute a pending inbox route action after user approval.
 * Mirrors the auto-execute logic from inbox-triage but triggered manually.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const auth = await validateCallerOrServiceRole(req);
    if (!auth.authorized) return auth.response;

    const { action_id, workspace_id } = await req.json();
    if (!action_id || !workspace_id) {
      return jsonResponse({ error: "action_id and workspace_id required" }, 400);
    }

    const sb = getSupabaseAdmin();

    const { data: action, error: fetchErr } = await sb
      .from("inbox_route_actions")
      .select("*")
      .eq("id", action_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (fetchErr || !action) {
      return jsonResponse({ error: "Action not found" }, 404);
    }

    if (action.status !== "pending") {
      return jsonResponse({ error: `Action already ${action.status}` }, 400);
    }

    let resultId: string | null = null;

    try {
      resultId = await executeAction(sb, workspace_id, action.action_type, action.payload);
    } catch (execErr: any) {
      console.error("Execution error:", execErr);
      return jsonResponse({ error: execErr.message }, 500);
    }

    await sb.from("inbox_route_actions").update({
      status: "executed",
      resolved_at: new Date().toISOString(),
      result_entity_id: resultId,
      updated_at: new Date().toISOString(),
    }).eq("id", action_id);

    return jsonResponse({ success: true, result_entity_id: resultId });
  } catch (e: unknown) {
    console.error("execute-route-action error:", e);
    return errorResponse(e, 500);
  }
});

async function executeAction(sb: any, workspaceId: string, actionType: string, payload: any): Promise<string | null> {
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

      if (payload.company_name && data?.id) {
        const { data: company } = await sb.from("companies")
          .select("id").eq("workspace_id", workspaceId)
          .ilike("name", payload.company_name)
          .is("deleted_at", null).maybeSingle();
        if (company) {
          await sb.from("contacts").update({ company_id: company.id }).eq("id", data.id);
        }
      }
      return data?.id ?? null;
    }

    case "update_contact": {
      if (!payload.contact_email || !payload.updates) return null;
      const { data: contact } = await sb.from("contacts")
        .select("id").eq("workspace_id", workspaceId)
        .eq("email", payload.contact_email)
        .is("deleted_at", null).maybeSingle();
      if (!contact) return null;
      const updates: any = { updated_at: new Date().toISOString() };
      if (payload.updates.status) updates.status = payload.updates.status;
      if (payload.updates.vip_tier) updates.vip_tier = payload.updates.vip_tier;
      if (payload.updates.notes) updates.notes = payload.updates.notes;
      await sb.from("contacts").update(updates).eq("id", contact.id);
      return contact.id;
    }

    case "create_deal": {
      let companyId = null;
      if (payload.company_name) {
        const { data: company } = await sb.from("companies")
          .select("id").eq("workspace_id", workspaceId)
          .ilike("name", payload.company_name)
          .is("deleted_at", null).maybeSingle();
        companyId = company?.id ?? null;
      }
      let contactId = null;
      if (payload.contact_email) {
        const { data: contact } = await sb.from("contacts")
          .select("id").eq("workspace_id", workspaceId)
          .eq("email", payload.contact_email)
          .is("deleted_at", null).maybeSingle();
        contactId = contact?.id ?? null;
      }
      const { data, error } = await sb.from("deals").insert({
        workspace_id: workspaceId,
        title: payload.title || "Untitled Deal",
        value: payload.value_estimate ? Number(payload.value_estimate) : null,
        stage: payload.stage || "prospecting",
        company_id: companyId,
        contact_id: contactId,
        notes: "Auto-created from inbox triage",
      }).select("id").single();
      if (error) throw error;
      return data?.id ?? null;
    }

    case "schedule_followup": {
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
        .select("id").eq("workspace_id", workspaceId)
        .eq("email", payload.contact_email)
        .is("deleted_at", null).maybeSingle();
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

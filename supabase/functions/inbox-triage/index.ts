import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateCallerOrServiceRole } from "../_shared/auth-guard.ts";

const AUTO_EXECUTE_THRESHOLD = 80;
const AFFILIATE_AUTO_INSERT_THRESHOLD = 85;

// Weighted matching rules for affiliate program identification
interface AffiliateExtraction {
  amount: number | null;
  transaction_date: string | null;
  program_name: string | null;
  reference_id: string | null;
  currency: string;
  raw: Record<string, unknown>;
}

interface ProgramMatch {
  program_id: string;
  company_name: string | null;
  score: number;
  match_reasons: string[];
}

// Known payout email patterns from affiliate networks
const KNOWN_PAYOUT_PATTERNS: { domain: string; network: string; weight: number }[] = [
  { domain: "impact.com", network: "Impact", weight: 30 },
  { domain: "partnerstack.com", network: "PartnerStack", weight: 30 },
  { domain: "shareasale.com", network: "ShareASale", weight: 30 },
  { domain: "cj.com", network: "CJ Affiliate", weight: 30 },
  { domain: "rakuten.com", network: "Rakuten", weight: 25 },
  { domain: "awin.com", network: "Awin", weight: 30 },
  { domain: "amazon.com", network: "Amazon Associates", weight: 20 },
  { domain: "paypal.com", network: "PayPal", weight: 10 },
  { domain: "stripe.com", network: "Stripe", weight: 10 },
  { domain: "paddle.com", network: "Paddle", weight: 25 },
  { domain: "lemonsqueezy.com", network: "Lemon Squeezy", weight: 25 },
  { domain: "gumroad.com", network: "Gumroad", weight: 25 },
  { domain: "wise.com", network: "Wise", weight: 10 },
  { domain: "payoneer.com", network: "Payoneer", weight: 15 },
];

function matchSenderDomain(fromEmail: string): { network: string; weight: number } | null {
  const domain = fromEmail.split("@")[1]?.toLowerCase() ?? "";
  for (const p of KNOWN_PAYOUT_PATTERNS) {
    if (domain.includes(p.domain)) return { network: p.network, weight: p.weight };
  }
  return null;
}

function matchProgramNameAlias(
  extractedName: string | null,
  programs: { id: string; company_name: string | null; notes: string | null }[],
): ProgramMatch[] {
  if (!extractedName) return [];
  const needle = extractedName.toLowerCase().trim();
  const matches: ProgramMatch[] = [];
  for (const p of programs) {
    let score = 0;
    const reasons: string[] = [];
    const companyLower = (p.company_name ?? "").toLowerCase();
    // Exact match
    if (companyLower === needle) {
      score += 50;
      reasons.push("exact_company_name");
    } else if (companyLower.includes(needle) || needle.includes(companyLower)) {
      score += 30;
      reasons.push("partial_company_name");
    }
    // Check notes for aliases
    if (p.notes) {
      const notesLower = p.notes.toLowerCase();
      if (notesLower.includes(needle)) {
        score += 20;
        reasons.push("alias_in_notes");
      }
    }
    if (score > 0) {
      matches.push({ program_id: p.id, company_name: p.company_name, score, match_reasons: reasons });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

function matchPayoutFormat(
  senderDomainMatch: { network: string; weight: number } | null,
  programs: { id: string; company_name: string | null; payment_methods: unknown }[],
): ProgramMatch[] {
  if (!senderDomainMatch) return [];
  const matches: ProgramMatch[] = [];
  for (const p of programs) {
    const methods = p.payment_methods;
    if (methods && Array.isArray(methods)) {
      for (const m of methods) {
        const methodStr = typeof m === "string" ? m : JSON.stringify(m);
        if (methodStr.toLowerCase().includes(senderDomainMatch.network.toLowerCase())) {
          matches.push({
            program_id: p.id,
            company_name: p.company_name,
            score: 20,
            match_reasons: ["payout_method_match"],
          });
          break;
        }
      }
    }
  }
  return matches;
}

function mergeMatches(matchSets: ProgramMatch[][]): ProgramMatch[] {
  const merged = new Map<string, ProgramMatch>();
  for (const set of matchSets) {
    for (const m of set) {
      const existing = merged.get(m.program_id);
      if (existing) {
        existing.score += m.score;
        existing.match_reasons.push(...m.match_reasons);
      } else {
        merged.set(m.program_id, { ...m, match_reasons: [...m.match_reasons] });
      }
    }
  }
  return [...merged.values()].sort((a, b) => b.score - a.score);
}

async function handleAffiliateDetection(
  sb: any,
  workspaceId: string,
  emailId: string,
  extraction: AffiliateExtraction,
  fromEmail: string,
  programs: { id: string; company_name: string | null; notes: string | null; payment_methods: unknown }[],
): Promise<{ autoInserted: boolean; queuedForReview: boolean }> {
  const senderMatch = matchSenderDomain(fromEmail);
  const nameMatches = matchProgramNameAlias(extraction.program_name, programs);
  const payoutMatches = matchPayoutFormat(senderMatch, programs);

  // Add sender domain weight to all candidates
  const senderBoost: ProgramMatch[] = senderMatch
    ? programs.map((p) => ({
        program_id: p.id,
        company_name: p.company_name,
        score: 0,
        match_reasons: [] as string[],
      }))
    : [];
  // Only boost candidates that also appear in name or payout matches
  const candidateIds = new Set([...nameMatches, ...payoutMatches].map((m) => m.program_id));
  const boosted = senderMatch
    ? [...candidateIds].map((id) => ({
        program_id: id,
        company_name: programs.find((p) => p.id === id)?.company_name ?? null,
        score: senderMatch.weight,
        match_reasons: [`sender_domain:${senderMatch.network}`],
      }))
    : [];

  const allMatches = mergeMatches([nameMatches, payoutMatches, boosted]);
  const bestMatch = allMatches[0];
  const confidence = bestMatch ? Math.min(100, bestMatch.score) : 0;

  if (bestMatch && confidence >= AFFILIATE_AUTO_INSERT_THRESHOLD && extraction.amount != null) {
    // Auto-insert transaction
    await sb.from("affiliate_transactions").insert({
      workspace_id: workspaceId,
      affiliate_program_id: bestMatch.program_id,
      amount: extraction.amount,
      sale_amount: 0,
      currency: extraction.currency || "USD",
      status: "confirmed",
      transaction_date: extraction.transaction_date || new Date().toISOString(),
      description: `Auto-detected from inbox email (ref: ${extraction.reference_id || "N/A"})`,
      metadata: {
        source: "inbox_triage",
        email_id: emailId,
        extraction: extraction.raw,
        match_confidence: confidence,
        match_reasons: bestMatch.match_reasons,
        matched_program: bestMatch.company_name,
      },
    });
    return { autoInserted: true, queuedForReview: false };
  } else {
    // Queue for manual review with suggested matches
    await sb.from("inbox_review_queue").insert({
      workspace_id: workspaceId,
      email_id: emailId,
      review_type: "affiliate_transaction",
      confidence,
      extracted_data: {
        amount: extraction.amount,
        transaction_date: extraction.transaction_date,
        program_name: extraction.program_name,
        reference_id: extraction.reference_id,
        currency: extraction.currency,
        raw: extraction.raw,
      },
      suggested_matches: allMatches.slice(0, 5).map((m) => ({
        program_id: m.program_id,
        company_name: m.company_name,
        score: m.score,
        reasons: m.match_reasons,
      })),
    });
    return { autoInserted: false, queuedForReview: true };
  }
}

// ── Main handler ──

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

    // Fetch untriaged emails
    const { data: emails } = await sb
      .from("inbox_emails")
      .select("id, from_name, from_email, subject, preview, folder")
      .eq("workspace_id", workspace_id)
      .is("ai_priority", null)
      .in("folder", ["inbox", "INBOX"])
      .order("received_at", { ascending: false })
      .limit(emailLimit || 30);

    if (!emails?.length) return jsonResponse({ triaged: 0, route_actions: 0, affiliate_detected: 0 });

    // Fetch CRM contacts for context
    const { data: contacts } = await sb
      .from("contacts")
      .select("id, email, first_name, last_name, status, vip_tier, company_id")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null);

    const contactMap = new Map<string, any>();
    for (const c of (contacts ?? []) as any[]) {
      if (c.email) contactMap.set(c.email.toLowerCase(), c);
    }

    // Fetch active sequences
    const { data: sequences } = await sb
      .from("email_sequences")
      .select("id, name")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .limit(10);

    const sequenceList = (sequences ?? []).map((s: any) => `${s.name} (id: ${s.id})`).join(", ");

    // Fetch affiliate programs for matching
    const { data: affiliatePrograms } = await sb
      .from("affiliate_programs")
      .select("id, company_id, notes, payment_methods")
      .eq("workspace_id", workspace_id);

    // Enrich programs with company names
    const programCompanyIds = (affiliatePrograms ?? []).map((p: any) => p.company_id).filter(Boolean);
    let companiesMap = new Map<string, string>();
    if (programCompanyIds.length > 0) {
      const { data: companies } = await sb
        .from("companies")
        .select("id, name")
        .in("id", programCompanyIds);
      for (const c of (companies ?? []) as any[]) {
        companiesMap.set(c.id, c.name);
      }
    }

    const enrichedPrograms = ((affiliatePrograms ?? []) as any[]).map((p) => ({
      id: p.id,
      company_name: companiesMap.get(p.company_id) ?? null,
      notes: p.notes,
      payment_methods: p.payment_methods,
    }));

    // Process in batches
    const batchSize = 15;
    let totalTriaged = 0;
    let totalRouteActions = 0;
    let autoExecuted = 0;
    let affiliateDetected = 0;
    let affiliateAutoInserted = 0;
    let affiliateQueued = 0;

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

1. category: "sponsor_inquiry" | "partnership_request" | "fan_mail" | "newsletter" | "marketing" | "spam" | "affiliate_transaction_detected"
2. priority: "P1" (urgent/revenue) | "P2" (important) | "P3" (normal) | "P4" (low)
3. intent: "action_required" | "reply_needed" | "follow_up" | "fyi" | "archive"
4. suggested_action: Brief 1-sentence action
5. route_actions: Array of automated actions (see below)
6. affiliate_extraction: (ONLY if category is "affiliate_transaction_detected") Object with:
   - amount: number or null (the commission/payout amount)
   - transaction_date: ISO date string or null
   - program_name: string or null (the affiliate program or company name)
   - reference_id: string or null (any transaction/reference ID found)
   - currency: string (default "USD")

Action payload formats for route_actions:
- create_contact: { first_name, last_name, email, company_name, role }
- update_contact: { contact_email, updates: { status?, vip_tier?, notes? } }
- create_deal: { title, value_estimate, company_name, contact_email, stage: "prospecting" }
- schedule_followup: { contact_email, days_from_now, reason }
- enroll_sequence: { contact_email, sequence_id, reason }

Each route_action has: type, confidence (0-100), payload, rationale.

Rules:
- "affiliate_transaction_detected": Use when email is clearly a payout notification, commission statement, or affiliate earning report. Look for keywords: "commission", "payout", "earning", "referral", "affiliate", "payment processed", "revenue share". Extract dollar amounts, dates, program names.
- [CRM CONTACT]/[VIP] emails: at least P2. For VIPs, suggest update_contact if relevant.
- Sponsor inquiries → create_deal (confidence 70-95)
- Unknown senders with business emails → create_contact (confidence 60-90)
- Partnership requests → create_deal + schedule_followup
- If sender is already a contact, DON'T suggest create_contact
- Spam/newsletter → no route_actions
- Be conservative with confidence: only 85+ if very clear intent${sequenceList ? `\n\nAvailable sequences for enrollment: ${sequenceList}` : ""}

Return ONLY JSON array: [{"index": 1, "category": "...", "priority": "...", "intent": "...", "suggested_action": "...", "route_actions": [...], "affiliate_extraction": null | {...}}]`,
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

        const validCategories = [
          "sponsor_inquiry", "partnership_request", "fan_mail",
          "newsletter", "marketing", "spam", "affiliate_transaction_detected",
        ];
        const validPriorities = ["P1", "P2", "P3", "P4"];

        await sb.from("inbox_emails").update({
          ai_category: validCategories.includes(c.category) ? c.category : "marketing",
          ai_priority: validPriorities.includes(c.priority) ? c.priority : "P3",
          ai_intent: c.intent || "fyi",
          ai_suggested_action: c.suggested_action || null,
          ai_summary: c.suggested_action || null,
        }).eq("id", email.id);

        totalTriaged++;

        // Handle affiliate transaction detection
        if (c.category === "affiliate_transaction_detected" && c.affiliate_extraction) {
          affiliateDetected++;
          const extraction: AffiliateExtraction = {
            amount: c.affiliate_extraction.amount ?? null,
            transaction_date: c.affiliate_extraction.transaction_date ?? null,
            program_name: c.affiliate_extraction.program_name ?? null,
            reference_id: c.affiliate_extraction.reference_id ?? null,
            currency: c.affiliate_extraction.currency || "USD",
            raw: c.affiliate_extraction,
          };

          const result = await handleAffiliateDetection(
            sb, workspace_id, email.id, extraction, email.from_email || "", enrichedPrograms,
          );
          if (result.autoInserted) affiliateAutoInserted++;
          if (result.queuedForReview) affiliateQueued++;
        }

        // Process route actions (existing logic)
        const routeActions = c.route_actions ?? [];
        for (const action of routeActions) {
          if (!action.type || action.confidence == null) continue;

          const validTypes = ["create_contact", "update_contact", "create_deal", "schedule_followup", "enroll_sequence"];
          if (!validTypes.includes(action.type)) continue;

          const confidence = Math.max(0, Math.min(100, Number(action.confidence)));
          const shouldAutoExecute = confidence >= AUTO_EXECUTE_THRESHOLD;

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
      title: `Triaged ${totalTriaged} emails, ${affiliateDetected} affiliate txns detected`,
      description: `Categorized ${totalTriaged} emails. ${totalRouteActions} route actions (${autoExecuted} auto-executed). ${affiliateDetected} affiliate transactions detected (${affiliateAutoInserted} auto-inserted, ${affiliateQueued} queued for review).`,
      metadata: {
        email_count: totalTriaged,
        route_actions: totalRouteActions,
        auto_executed: autoExecuted,
        affiliate_detected: affiliateDetected,
        affiliate_auto_inserted: affiliateAutoInserted,
        affiliate_queued: affiliateQueued,
      },
    });

    return jsonResponse({
      triaged: totalTriaged,
      route_actions: totalRouteActions,
      auto_executed: autoExecuted,
      affiliate_detected: affiliateDetected,
      affiliate_auto_inserted: affiliateAutoInserted,
      affiliate_queued: affiliateQueued,
    });
  } catch (e: unknown) {
    console.error("inbox-triage error:", e);
    return errorResponse(e, 500);
  }
});

// ── Route action executor (unchanged) ──

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

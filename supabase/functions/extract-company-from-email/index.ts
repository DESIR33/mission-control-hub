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
    const { workspace_id, from_email, from_name, subject, body_text } = await req.json();

    if (!workspace_id || !from_email) {
      return new Response(JSON.stringify({ error: "workspace_id and from_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) throw new Error("OPENROUTER_API_KEY not set");

    const domain = from_email.split("@")[1] || "";
    const isGenericDomain = [
      "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
      "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
      "live.com", "msn.com", "me.com", "pm.me",
    ].includes(domain.toLowerCase());

    // Truncate body to first 1500 chars for context
    const bodySnippet = (body_text || "").substring(0, 1500);

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
            content: `You are a CRM data extraction assistant. Given an email, extract company information.

Rules:
1. Identify the PRIMARY company the sender represents. Use email domain, sender name, subject line, and email body as context.
2. If the sender uses a generic email (gmail, yahoo, etc.), infer the company from the email content (signatures, mentions, context).
3. DETECT AGENCIES: If the sender is from an agency/firm reaching out on behalf of another company (client), identify BOTH:
   - The agency (the sender's organization)
   - The client company they represent
   Common agency patterns: "on behalf of", "our client", "we represent", "partnered with", "reaching out for", agency/PR/marketing firm signatures.
4. Extract as much info as possible: company name, website, industry, description.

Respond with ONLY valid JSON (no markdown):
{
  "company_name": "string - the primary company name",
  "company_website": "string or null - best guess at website URL",
  "company_industry": "string or null",
  "company_description": "string or null - one-line description",
  "is_agency": false,
  "agency_name": "string or null - only if is_agency is true, the agency name",
  "agency_website": "string or null - only if is_agency is true",
  "client_company_name": "string or null - only if is_agency is true, the company the agency represents",
  "client_company_website": "string or null",
  "client_company_industry": "string or null",
  "confidence": "high|medium|low"
}

If is_agency is true:
- company_name should be the CLIENT company (the brand/product)
- agency_name should be the agency/PR firm
If is_agency is false:
- company_name is the sender's company
- agency fields should be null`,
          },
          {
            role: "user",
            content: `Extract company info from this email:

From: ${from_name || "Unknown"} <${from_email}>
Domain: ${domain} (${isGenericDomain ? "GENERIC - must infer company from content" : "corporate domain"})
Subject: ${subject || "(no subject)"}
Body preview:
${bodySnippet || "(no body available)"}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      throw new Error("AI extraction failed");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";

    let extraction: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extraction = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse extraction:", content);
      // Fallback to domain-based extraction
      extraction = {
        company_name: isGenericDomain
          ? (from_name || from_email.split("@")[0])
          : domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1),
        company_website: isGenericDomain ? null : `https://${domain}`,
        is_agency: false,
        confidence: "low",
      };
    }

    // Now create the companies in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const isAgency = extraction.is_agency === true;
    const results: Record<string, unknown> = { extraction, created: [] };

    if (isAgency && extraction.agency_name && extraction.client_company_name) {
      // Create or find the client company (primary)
      const clientName = extraction.client_company_name as string;
      const clientWebsite = (extraction.client_company_website as string) || null;

      const { data: existingClient } = await supabase
        .from("companies")
        .select("id, name")
        .eq("workspace_id", workspace_id)
        .ilike("name", clientName)
        .maybeSingle();

      let clientId: string;
      if (existingClient) {
        clientId = existingClient.id;
        results.client_action = "existing";
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("companies")
          .insert({
            workspace_id: workspace_id,
            name: clientName,
            website: clientWebsite,
            industry: (extraction.client_company_industry as string) || null,
            description: (extraction.company_description as string) || null,
          })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
        results.client_action = "created";
        (results.created as string[]).push(clientName);
      }

      // Create or find the agency
      const agencyName = extraction.agency_name as string;
      const agencyWebsite = (extraction.agency_website as string) || (!isGenericDomain ? `https://${domain}` : null);

      const { data: existingAgency } = await supabase
        .from("companies")
        .select("id, name")
        .eq("workspace_id", workspace_id)
        .ilike("name", agencyName)
        .maybeSingle();

      let agencyId: string;
      if (existingAgency) {
        agencyId = existingAgency.id;
        // Ensure it's marked as agency
        await supabase.from("companies").update({ is_agency: true }).eq("id", agencyId);
        results.agency_action = "existing";
      } else {
        const { data: newAgency, error: agencyErr } = await supabase
          .from("companies")
          .insert({
            workspace_id: workspace_id,
            name: agencyName,
            website: agencyWebsite,
            primary_email: from_email,
            is_agency: true,
          })
          .select("id")
          .single();
        if (agencyErr) throw agencyErr;
        agencyId = newAgency.id;
        results.agency_action = "created";
        (results.created as string[]).push(agencyName);
      }

      // Link agency to client
      const { data: existingLink } = await supabase
        .from("company_agency_links")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("agency_id", agencyId)
        .eq("client_company_id", clientId)
        .maybeSingle();

      if (!existingLink) {
        await supabase.from("company_agency_links").insert({
          workspace_id: workspace_id,
          agency_id: agencyId,
          client_company_id: clientId,
          notes: `Detected from email: ${subject || "(no subject)"}`,
        });
        results.link_action = "created";
      } else {
        results.link_action = "existing";
      }

      results.client_company_id = clientId;
      results.agency_company_id = agencyId;
    } else {
      // Simple company creation
      const companyName = (extraction.company_name as string) || domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
      const companyWebsite = (extraction.company_website as string) || (!isGenericDomain ? `https://${domain}` : null);

      // Check for existing by name (case-insensitive)
      const { data: existingByName } = await supabase
        .from("companies")
        .select("id, name")
        .eq("workspace_id", workspace_id)
        .ilike("name", companyName)
        .maybeSingle();

      // Also check by website if available
      let existingByWebsite = null;
      if (companyWebsite && !existingByName) {
        const { data } = await supabase
          .from("companies")
          .select("id, name")
          .eq("workspace_id", workspace_id)
          .eq("website", companyWebsite)
          .maybeSingle();
        existingByWebsite = data;
      }

      const existing = existingByName || existingByWebsite;

      if (existing) {
        // Update with new info
        await supabase.from("companies").update({
          primary_email: from_email,
          ...(extraction.company_industry ? { industry: extraction.company_industry as string } : {}),
          ...(extraction.company_description ? { description: extraction.company_description as string } : {}),
        }).eq("id", existing.id);
        results.company_id = existing.id;
        results.company_action = "updated";
      } else {
        const { data: newCompany, error: companyErr } = await supabase
          .from("companies")
          .insert({
            workspace_id: workspace_id,
            name: companyName,
            website: companyWebsite,
            primary_email: from_email,
            industry: (extraction.company_industry as string) || null,
            description: (extraction.company_description as string) || null,
          })
          .select("id")
          .single();
        if (companyErr) throw companyErr;
        results.company_id = newCompany.id;
        results.company_action = "created";
        (results.created as string[]).push(companyName);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-company-from-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

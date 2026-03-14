import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function stripePost(url: string, secretKey: string, body: Record<string, any>) {
  const formData = new URLSearchParams();
  function flatten(obj: any, prefix = "") {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (v != null && typeof v === "object" && !Array.isArray(v)) {
        flatten(v, key);
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === "object") flatten(item, `${key}[${i}]`);
          else formData.append(`${key}[${i}]`, String(item));
        });
      } else if (v != null) {
        formData.append(key, String(v));
      }
    }
  }
  flatten(body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error: ${data.error?.message || res.status}`);
  return data;
}

async function stripeGet(url: string, secretKey: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error: ${data.error?.message || res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { workspace_id, action, invoice_id, invoice_data } = await req.json();
    if (!workspace_id) throw new Error("Missing workspace_id");

    // Get Stripe secret key
    const { data: integration } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "stripe")
      .single();

    const stripeKey = integration?.config?.secret_key;

    // ── ACTION: create-stripe-invoice ──
    if (action === "create-stripe-invoice") {
      if (!stripeKey) throw new Error("Stripe not connected. Add your secret key in Settings → Integrations.");
      if (!invoice_id) throw new Error("Missing invoice_id");

      // Get invoice from DB
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice_id)
        .single();
      if (invErr || !invoice) throw new Error("Invoice not found");

      // Find or create Stripe customer
      let customerId: string | undefined;
      if (invoice.client_email) {
        const existing = await stripeGet(
          `https://api.stripe.com/v1/customers?email=${encodeURIComponent(invoice.client_email)}&limit=1`,
          stripeKey,
        );
        if (existing.data?.length > 0) {
          customerId = existing.data[0].id;
        } else {
          const newCustomer = await stripePost(
            "https://api.stripe.com/v1/customers",
            stripeKey,
            {
              email: invoice.client_email,
              name: invoice.client_name || undefined,
              description: `Invoice client: ${invoice.client_name || invoice.client_email}`,
            },
          );
          customerId = newCustomer.id;
        }
      }

      // Create Stripe invoice
      const stripeInvoice = await stripePost(
        "https://api.stripe.com/v1/invoices",
        stripeKey,
        {
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: 30,
          currency: (invoice.currency || "usd").toLowerCase(),
          description: `Invoice ${invoice.invoice_number}`,
          metadata: {
            lovable_invoice_id: invoice.id,
            workspace_id: workspace_id,
          },
        },
      );

      // Add line items
      const lineItems = invoice.line_items || [];
      for (const item of lineItems) {
        await stripePost("https://api.stripe.com/v1/invoiceitems", stripeKey, {
          customer: customerId,
          invoice: stripeInvoice.id,
          amount: Math.round((item.amount || 0) * (item.quantity || 1) * 100),
          currency: (invoice.currency || "usd").toLowerCase(),
          description: item.description || "Sponsorship",
        });
      }

      // If no line items, add single item for total
      if (lineItems.length === 0) {
        await stripePost("https://api.stripe.com/v1/invoiceitems", stripeKey, {
          customer: customerId,
          invoice: stripeInvoice.id,
          amount: Math.round((invoice.total_amount || 0) * 100),
          currency: (invoice.currency || "usd").toLowerCase(),
          description: `Sponsorship Invoice ${invoice.invoice_number}`,
        });
      }

      // Finalize the invoice
      const finalized = await stripePost(
        `https://api.stripe.com/v1/invoices/${stripeInvoice.id}/finalize`,
        stripeKey,
        {},
      );

      // Update our DB with Stripe IDs
      await supabase.from("invoices").update({
        stripe_invoice_id: finalized.id,
        stripe_payment_url: finalized.hosted_invoice_url,
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", invoice_id);

      return new Response(
        JSON.stringify({
          success: true,
          stripe_invoice_id: finalized.id,
          payment_url: finalized.hosted_invoice_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── ACTION: sync-invoice-status ──
    if (action === "sync-invoice-status") {
      if (!stripeKey) throw new Error("Stripe not connected");

      // Get all invoices with stripe IDs
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, stripe_invoice_id, status")
        .eq("workspace_id", workspace_id)
        .not("stripe_invoice_id", "is", null);

      let updated = 0;
      for (const inv of invoices || []) {
        try {
          const stripeInv = await stripeGet(
            `https://api.stripe.com/v1/invoices/${inv.stripe_invoice_id}`,
            stripeKey,
          );

          let newStatus = inv.status;
          if (stripeInv.status === "paid") {
            newStatus = "paid";
          } else if (stripeInv.status === "void") {
            newStatus = "void";
          } else if (stripeInv.status === "uncollectible") {
            newStatus = "overdue";
          } else if (stripeInv.status === "open") {
            // Check if past due
            if (stripeInv.due_date && stripeInv.due_date * 1000 < Date.now()) {
              newStatus = "overdue";
            } else {
              newStatus = "sent";
            }
          }

          if (newStatus !== inv.status) {
            await supabase.from("invoices").update({
              status: newStatus,
              paid_date: newStatus === "paid" ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }).eq("id", inv.id);
            updated++;
          }
        } catch (e) {
          console.error(`Failed to sync invoice ${inv.id}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── ACTION: auto-generate ──
    if (action === "auto-generate") {
      // Find closed_won deals without invoices
      const { data: deals } = await supabase
        .from("deals")
        .select("id, title, value, currency, company_id, contact_id, companies(name, website), contacts(first_name, last_name, email)")
        .eq("workspace_id", workspace_id)
        .eq("stage", "closed_won")
        .is("deleted_at", null);

      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("deal_id")
        .eq("workspace_id", workspace_id);

      const invoicedDealIds = new Set((existingInvoices || []).map((i: any) => i.deal_id).filter(Boolean));
      const uninvoicedDeals = (deals || []).filter((d: any) => !invoicedDealIds.has(d.id));

      // Get next invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }

      const created: string[] = [];
      for (const deal of uninvoicedDeals) {
        const company = deal.companies as any;
        const contact = deal.contacts as any;
        const invoiceNumber = `INV-${String(nextNum++).padStart(4, "0")}`;

        const { error } = await supabase.from("invoices").insert({
          workspace_id,
          deal_id: deal.id,
          company_id: deal.company_id,
          contact_id: deal.contact_id,
          invoice_number: invoiceNumber,
          status: "draft",
          amount: deal.value || 0,
          currency: deal.currency || "USD",
          total_amount: deal.value || 0,
          client_name: company?.name || null,
          client_email: contact?.email || null,
          line_items: [{ description: deal.title, quantity: 1, amount: deal.value || 0 }],
          payment_terms: "Net 30",
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        });

        if (!error) created.push(invoiceNumber);
      }

      return new Response(
        JSON.stringify({ success: true, created: created.length, invoice_numbers: created }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: unknown) {
    console.error("invoice-manager error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

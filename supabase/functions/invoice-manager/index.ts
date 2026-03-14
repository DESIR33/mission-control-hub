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

    // ── ACTION: send-invoice-email ──
    if (action === "send-invoice-email") {
      if (!invoice_id) throw new Error("Missing invoice_id");

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice_id)
        .single();
      if (invErr || !invoice) throw new Error("Invoice not found");
      if (!invoice.client_email) throw new Error("No client email address on this invoice. Edit the invoice to add one.");

      // Get Resend integration config
      const { data: resendIntegration } = await supabase
        .from("workspace_integrations")
        .select("config")
        .eq("workspace_id", workspace_id)
        .eq("integration_key", "resend")
        .eq("enabled", true)
        .single();

      if (!resendIntegration?.config?.api_key) {
        throw new Error("Resend email integration not configured. Go to Settings → Integrations to set up your API key.");
      }

      const resendApiKey = resendIntegration.config.api_key;
      const fromEmail = resendIntegration.config.from_email || "noreply@example.com";

      // Build invoice HTML email
      const lineItems = invoice.line_items || [];
      const fmtCurrency = (amount: number, currency = "USD") =>
        new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

      const lineItemsHtml = lineItems.length > 0
        ? lineItems.map((item: any) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px">${item.description || ""}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">${item.quantity || 1}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">${fmtCurrency(item.amount || 0, invoice.currency)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">${fmtCurrency((item.amount || 0) * (item.quantity || 1), invoice.currency)}</td>
            </tr>`).join("")
        : `<tr><td colspan="4" style="padding:10px;text-align:center;color:#999">No line items</td></tr>`;

      const issuedDate = invoice.issued_date
        ? new Date(invoice.issued_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const dueDate = invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

      const paymentLinkHtml = invoice.stripe_payment_url
        ? `<div style="text-align:center;margin:30px 0">
             <a href="${invoice.stripe_payment_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Pay Invoice Online</a>
           </div>`
        : "";

      const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <!-- Header -->
      <div style="background:#1a1a2e;color:#fff;padding:32px;text-align:center">
        ${invoice.brand_logo_url ? `<img src="${invoice.brand_logo_url}" alt="" style="height:36px;margin-bottom:12px">` : ""}
        <h1 style="margin:0;font-size:20px;font-weight:700">${invoice.brand_name || "Invoice"}</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.8">${invoice.brand_address || ""}</p>
      </div>

      <div style="padding:32px">
        <!-- Invoice Info -->
        <div style="display:flex;justify-content:space-between;margin-bottom:24px">
          <div>
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999">Invoice</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#2563eb">${invoice.invoice_number}</p>
          </div>
          <div style="text-align:right">
            <p style="margin:0;font-size:12px;color:#666">Issued: ${issuedDate}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#666">Due: ${dueDate}</p>
          </div>
        </div>

        <!-- Bill To -->
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999">Bill To</p>
          <p style="margin:6px 0 0;font-size:14px;font-weight:600">${invoice.client_name || "—"}</p>
          <p style="margin:2px 0 0;font-size:13px;color:#666">${invoice.client_email || ""}</p>
          ${invoice.client_address ? `<p style="margin:2px 0 0;font-size:13px;color:#666">${invoice.client_address}</p>` : ""}
        </div>

        <!-- Line Items Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#f8f9fa">
              <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #e5e7eb">Description</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #e5e7eb">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #e5e7eb">Rate</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #e5e7eb">Amount</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end">
          <div style="width:220px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px">
              <span>Subtotal</span><span>${fmtCurrency(invoice.amount, invoice.currency)}</span>
            </div>
            ${invoice.tax_rate > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px">
              <span>Tax (${invoice.tax_rate}%)</span><span>${fmtCurrency(invoice.tax_amount, invoice.currency)}</span>
            </div>` : ""}
            <div style="display:flex;justify-content:space-between;padding:10px 0 0;border-top:2px solid #1a1a1a;font-weight:700;font-size:16px">
              <span>Total</span><span>${fmtCurrency(invoice.total_amount, invoice.currency)}</span>
            </div>
          </div>
        </div>

        ${paymentLinkHtml}

        ${invoice.notes ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#999"><strong>Notes:</strong> ${invoice.notes}</p></div>` : ""}
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb">
          <p style="font-size:11px;color:#999;text-align:center">Payment Terms: ${invoice.payment_terms || "Net 30"}</p>
        </div>
      </div>
    </div>
  </div>
</body></html>`;

      // Send via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [invoice.client_email],
          subject: `Invoice ${invoice.invoice_number} from ${invoice.brand_name || "us"}`,
          html: emailHtml,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        throw new Error(`Email send failed: ${resendRes.status} - ${errBody}`);
      }

      const resendData = await resendRes.json();

      // Update invoice status
      await supabase.from("invoices").update({
        status: invoice.status === "draft" ? "sent" : invoice.status,
        sent_at: invoice.sent_at || new Date().toISOString(),
        issued_date: invoice.issued_date || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", invoice_id);

      // Log activity if contact exists
      if (invoice.contact_id) {
        await supabase.from("activities").insert({
          workspace_id,
          entity_id: invoice.contact_id,
          entity_type: "contact",
          activity_type: "email",
          title: `Invoice ${invoice.invoice_number} sent`,
          description: `Invoice emailed to ${invoice.client_email}`,
          metadata: { invoice_id, resend_id: resendData.id },
          performed_at: new Date().toISOString(),
        });
      }

      return new Response(
        JSON.stringify({ success: true, email_id: resendData.id }),
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

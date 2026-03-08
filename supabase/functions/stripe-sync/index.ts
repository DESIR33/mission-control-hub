import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created: number;
  customer: string | null;
  metadata: Record<string, string>;
  receipt_email: string | null;
  billing_details?: { name: string | null; email: string | null };
}

interface StripeSubscription {
  id: string;
  status: string;
  created: number;
  current_period_start: number;
  current_period_end: number;
  customer: string;
  items: { data: Array<{ price: { id: string; unit_amount: number; currency: string; recurring: { interval: string } | null; product: string | { name?: string } } }> };
  metadata: Record<string, string>;
}

async function stripeGet(url: string, secretKey: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const fullUrl = qs ? `${url}?${qs}` : url;
  const res = await fetch(fullUrl, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe API error (${res.status}): ${body}`);
  }
  return res.json();
}

async function syncCharges(supabase: any, workspaceId: string, secretKey: string): Promise<number> {
  let synced = 0;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Record<string, string> = { limit: "100" };
    if (startingAfter) params.starting_after = startingAfter;

    const result = await stripeGet("https://api.stripe.com/v1/charges", secretKey, params);
    const charges: StripeCharge[] = result.data;

    if (charges.length === 0) break;

    for (const charge of charges) {
      const { error } = await supabase.from("revenue_transactions").upsert(
        {
          workspace_id: workspaceId,
          source: "stripe",
          external_id: charge.id,
          type: "payment",
          status: charge.status,
          amount: charge.amount,
          currency: charge.currency,
          description: charge.description,
          customer_id: charge.customer,
          customer_email: charge.billing_details?.email || charge.receipt_email,
          customer_name: charge.billing_details?.name,
          metadata: charge.metadata || {},
          external_created_at: new Date(charge.created * 1000).toISOString(),
        },
        { onConflict: "workspace_id,source,external_id" }
      );
      if (!error) synced++;
    }

    hasMore = result.has_more;
    if (charges.length > 0) startingAfter = charges[charges.length - 1].id;
  }

  return synced;
}

async function syncSubscriptions(supabase: any, workspaceId: string, secretKey: string): Promise<number> {
  let synced = 0;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Record<string, string> = { limit: "100", status: "all", "expand[]": "data.items.data.price.product" };
    if (startingAfter) params.starting_after = startingAfter;

    const result = await stripeGet("https://api.stripe.com/v1/subscriptions", secretKey, params);
    const subs: StripeSubscription[] = result.data;

    if (subs.length === 0) break;

    for (const sub of subs) {
      const item = sub.items.data[0];
      const price = item?.price;
      const productName = typeof price?.product === "object" ? (price.product as any)?.name : undefined;

      const { error } = await supabase.from("revenue_transactions").upsert(
        {
          workspace_id: workspaceId,
          source: "stripe",
          external_id: sub.id,
          type: "subscription",
          status: sub.status,
          amount: price?.unit_amount || 0,
          currency: price?.currency || "usd",
          description: `Subscription: ${productName || sub.id}`,
          customer_id: sub.customer,
          product_name: productName,
          price_id: price?.id,
          interval: price?.recurring?.interval,
          subscription_id: sub.id,
          metadata: {
            ...sub.metadata,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          },
          external_created_at: new Date(sub.created * 1000).toISOString(),
        },
        { onConflict: "workspace_id,source,external_id" }
      );
      if (!error) synced++;
    }

    hasMore = result.has_more;
    if (subs.length > 0) startingAfter = subs[subs.length - 1].id;
  }

  return synced;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, action } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Stripe credentials from workspace integrations
    const { data: integration, error: intError } = await supabase
      .from("workspace_integrations")
      .select("config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "stripe")
      .single();

    if (intError || !integration?.config?.secret_key) {
      return new Response(JSON.stringify({ error: "Stripe not connected. Add your secret key in Settings → Integrations." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = integration.config.secret_key;

    // Test action — just verify the key works
    if (action === "test") {
      try {
        const balance = await stripeGet("https://api.stripe.com/v1/balance", secretKey);
        return new Response(JSON.stringify({
          valid: true,
          details: {
            available: balance.available?.map((b: any) => `${b.amount / 100} ${b.currency.toUpperCase()}`),
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ valid: false, errors: [e.message] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create sync log entry
    const { data: logEntry } = await supabase
      .from("stripe_sync_log")
      .insert({ workspace_id, status: "running" })
      .select("id")
      .single();

    const logId = logEntry?.id;

    try {
      // Sync charges and subscriptions
      const [chargesSynced, subsSynced] = await Promise.all([
        syncCharges(supabase, workspace_id, secretKey),
        syncSubscriptions(supabase, workspace_id, secretKey),
      ]);

      // Update sync log
      if (logId) {
        await supabase.from("stripe_sync_log").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          charges_synced: chargesSynced,
          subscriptions_synced: subsSynced,
        }).eq("id", logId);
      }

      return new Response(JSON.stringify({
        success: true,
        charges_synced: chargesSynced,
        subscriptions_synced: subsSynced,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (syncErr) {
      if (logId) {
        await supabase.from("stripe_sync_log").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: syncErr.message,
        }).eq("id", logId);
      }
      throw syncErr;
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Feature 6: Memory Webhook Dispatcher
 * Fires outbound webhooks when memory lifecycle events occur.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookEvent {
  workspace_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", encoder.encode(payload), key);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const event: WebhookEvent = await req.json();

    if (!event.workspace_id || !event.event_type) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active webhooks for this event type
    const { data: webhooks } = await supabase
      .from("memory_webhook_config")
      .select("id, url, secret, event_types")
      .eq("workspace_id", event.workspace_id)
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ delivered: 0, message: "No active webhooks" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter webhooks that subscribe to this event type
    const matching = webhooks.filter(
      (wh: any) => wh.event_types.includes(event.event_type) || wh.event_types.includes("*")
    );

    let delivered = 0;
    const errors: string[] = [];

    for (const webhook of matching) {
      const eventPayload = JSON.stringify({
        event_type: event.event_type,
        workspace_id: event.workspace_id,
        timestamp: new Date().toISOString(),
        data: event.payload,
      });

      const signature = await signPayload(eventPayload, webhook.secret);

      // Record the event
      const { data: eventRecord } = await supabase
        .from("memory_events")
        .insert({
          workspace_id: event.workspace_id,
          event_type: event.event_type,
          payload: event.payload,
          webhook_config_id: webhook.id,
          delivery_status: "pending",
        })
        .select("id")
        .single();

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MCH-Signature": signature,
            "X-MCH-Event": event.event_type,
          },
          body: eventPayload,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (response.ok) {
          delivered++;
          if (eventRecord) {
            await supabase
              .from("memory_events")
              .update({ delivery_status: "delivered", delivered_at: new Date().toISOString() })
              .eq("id", eventRecord.id);
          }
        } else {
          const errMsg = `HTTP ${response.status} from ${webhook.url}`;
          errors.push(errMsg);
          if (eventRecord) {
            await supabase
              .from("memory_events")
              .update({ delivery_status: "failed", error_message: errMsg })
              .eq("id", eventRecord.id);
          }
        }
      } catch (e) {
        const errMsg = `Delivery failed: ${(e as Error).message}`;
        errors.push(errMsg);
        if (eventRecord) {
          await supabase
            .from("memory_events")
            .update({ delivery_status: "failed", error_message: errMsg })
            .eq("id", eventRecord.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ delivered, total_webhooks: matching.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook dispatcher error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

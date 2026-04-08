import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";
const WORKSPACE_ID = "ea11b24d-27bd-4488-9760-2663bc788e04";
const PUBLICATION_ID = "pub_035829e7-9d29-4729-9c6f-acaa6e118908";

interface BeehiivSubscription {
  id: string;
  email: string;
  status: string;
  created: number;
  tier?: string;
  subscription_tier?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer_url?: string;
  custom_fields?: Array<{ name: string; value: string }>;
  stats?: {
    emails_sent?: number;
    total_sent?: number;
    total_received?: number;
    total_unique_opened?: number;
    total_clicked?: number;
    total_unique_clicked?: number;
    open_rate?: number;
    click_rate?: number;
    click_through_rate?: number;
  };
}

// ── Helpers ──

function mapStatus(bhStatus: string): string {
  switch (bhStatus) {
    case "active": return "subscribed";
    case "inactive": return "unsubscribed";
    case "pending":
    case "validating": return "pending";
    default: return "inactive";
  }
}

async function fetchAllPages<T>(
  url: string,
  apiKey: string,
  queryParams: Record<string, string> = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      ...queryParams,
      page: String(page),
      per_page: "100",
    });
    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Beehiiv API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const data = json.data as T[];
    if (!data || data.length === 0) break;
    items.push(...data);

    const totalPages =
      json.total_pages ?? Math.ceil((json.total_results ?? 0) / 100);
    if (page >= totalPages) break;
    page++;
  }

  return items;
}

function computeEngagement(stats: BeehiivSubscription["stats"]): {
  score: number;
  data: Record<string, unknown>;
} {
  const s = stats ?? {};
  const emailsSent = Number(s.total_sent ?? s.total_received ?? s.emails_sent ?? 0);
  const uniqueOpened = Number(s.total_unique_opened ?? 0);
  const totalClicked = Number(s.total_clicked ?? 0);
  const uniqueClicked = Number(s.total_unique_clicked ?? 0);
  let openRate = Number(s.open_rate ?? 0);
  let clickRate = Number(s.click_rate ?? s.click_through_rate ?? 0);

  // Normalize (beehiiv may return 0-100 or 0-1 scale)
  openRate = openRate > 1 ? openRate : openRate * 100;
  clickRate = clickRate > 1 ? clickRate : clickRate * 100;
  openRate = Math.round(openRate * 10) / 10;
  clickRate = Math.round(clickRate * 10) / 10;

  const score = Math.min(100, Math.round(openRate * 0.6 + clickRate * 0.4));

  return {
    score,
    data: {
      emails_sent: emailsSent,
      unique_opens: uniqueOpened,
      total_clicks: totalClicked,
      unique_clicks: uniqueClicked,
      open_rate: openRate,
      click_rate: clickRate,
    },
  };
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("BEEHIIV_API_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  // Create sync log entry
  const { data: syncLog } = await sb
    .from("beehiiv_sync_logs")
    .insert({
      workspace_id: WORKSPACE_ID,
      sync_type: "subscribers",
      status: "running",
    })
    .select("id")
    .single();

  const syncLogId = syncLog?.id;

  try {
    // ─── STEP 1: Fetch all subscribers from Beehiiv ───
    console.log("Step 1: Fetching subscribers from Beehiiv...");
    const subscriptions = await fetchAllPages<BeehiivSubscription>(
      `${BEEHIIV_BASE}/publications/${PUBLICATION_ID}/subscriptions`,
      apiKey,
      { "expand[]": "stats" },
    );
    console.log(`Fetched ${subscriptions.length} subscriptions from Beehiiv`);

    // Load existing subscribers for status change detection
    const { data: existingSubs } = await sb
      .from("subscribers")
      .select("id, email, beehiiv_id, beehiiv_status, status, deleted_at")
      .eq("workspace_id", WORKSPACE_ID);

    const existingByBeehiivId = new Map(
      (existingSubs ?? [])
        .filter((s) => s.beehiiv_id)
        .map((s) => [s.beehiiv_id, s]),
    );
    const existingByEmail = new Map(
      (existingSubs ?? []).map((s) => [s.email, s]),
    );

    let subscribersSynced = 0;
    let newSubscribersCount = 0;
    let statusChangesCount = 0;
    const activitiesToInsert: Array<Record<string, unknown>> = [];
    const opsItems: Array<Record<string, unknown>> = [];

    for (const sub of subscriptions) {
      const tier = sub.tier ?? sub.subscription_tier ?? "free";
      const newStatus = mapStatus(sub.status);
      const eng = computeEngagement(sub.stats);

      // Find existing record
      const existing =
        existingByBeehiivId.get(sub.id) ?? existingByEmail.get(sub.email);

      const row: Record<string, unknown> = {
        workspace_id: WORKSPACE_ID,
        beehiiv_id: sub.id,
        email: sub.email,
        status: newStatus,
        beehiiv_status: sub.status,
        beehiiv_tier: tier,
        source: "beehiiv",
        opt_in_confirmed: sub.status === "active",
        opt_in_confirmed_at:
          sub.status === "active"
            ? new Date(sub.created * 1000).toISOString()
            : null,
        utm_source: sub.utm_source ?? null,
        utm_medium: sub.utm_medium ?? null,
        utm_campaign: sub.utm_campaign ?? null,
        referrer: sub.referrer_url ?? null,
        engagement_score: eng.score,
        engagement_data: eng.data,
        updated_at: new Date().toISOString(),
      };

      // ─── STEP 2: Detect status changes ───
      if (existing) {
        const oldBhStatus = existing.beehiiv_status;
        if (oldBhStatus && oldBhStatus !== sub.status) {
          statusChangesCount++;

          // If changed to inactive → soft delete
          if (sub.status === "inactive") {
            row.deleted_at = new Date().toISOString();

            // Insert unsubscribe reason
            await sb.from("subscriber_unsubscribe_reasons").insert({
              workspace_id: WORKSPACE_ID,
              subscriber_id: existing.id,
              reason_category: "beehiiv_status_change",
              reason_text: `Status changed from ${oldBhStatus} to ${sub.status} via Beehiiv sync`,
            });
          }

          // If changed back to active → clear soft delete
          if (sub.status === "active" && existing.deleted_at) {
            row.deleted_at = null;
          }

          // Log status change activity
          activitiesToInsert.push({
            workspace_id: WORKSPACE_ID,
            entity_type: "subscriber",
            entity_id: existing.id,
            activity_type: "status_change",
            title: `Beehiiv status changed from ${oldBhStatus} to ${sub.status}`,
            description: `Subscriber ${sub.email} status updated during Beehiiv sync`,
          });
        }

        // Upsert using beehiiv_id match first, then email
        if (existing.beehiiv_id) {
          const { error } = await sb
            .from("subscribers")
            .update(row)
            .eq("id", existing.id);
          if (error) {
            console.error(`Update error (${sub.email}):`, error.message);
            continue;
          }
        } else {
          // Existing by email but no beehiiv_id → update to link
          row.created_at = new Date(sub.created * 1000).toISOString();
          const { error } = await sb
            .from("subscribers")
            .update(row)
            .eq("id", existing.id);
          if (error) {
            console.error(`Link error (${sub.email}):`, error.message);
            continue;
          }
        }
      } else {
        // ─── STEP 3: New subscriber ───
        row.created_at = new Date(sub.created * 1000).toISOString();
        const { data: inserted, error } = await sb
          .from("subscribers")
          .insert(row)
          .select("id")
          .single();

        if (error) {
          console.error(`Insert error (${sub.email}):`, error.message);
          continue;
        }

        newSubscribersCount++;

        // Log new subscriber activity
        if (inserted) {
          activitiesToInsert.push({
            workspace_id: WORKSPACE_ID,
            entity_type: "subscriber",
            entity_id: inserted.id,
            activity_type: "new_subscriber",
            title: `New subscriber from Beehiiv: ${sub.email}`,
            description: `Synced via beehiiv_sync, tier: ${tier}`,
            metadata: { source: "beehiiv_sync" },
          });

          // Premium tier → ops daily item
          if (tier === "premium") {
            opsItems.push({
              workspace_id: WORKSPACE_ID,
              source_type: "subscriber",
              source_id: inserted.id,
              title: `Premium subscriber: ${sub.email}`,
              subtitle: "New premium tier subscriber from Beehiiv",
              urgency_score: 70,
              scored_at: new Date().toISOString(),
              status: "pending",
            });
          }
        }
      }

      subscribersSynced++;
    }

    // Batch insert activities
    if (activitiesToInsert.length > 0) {
      const { error } = await sb.from("activities").insert(activitiesToInsert);
      if (error) console.error("Activities insert error:", error.message);
    }

    // Batch insert ops items
    if (opsItems.length > 0) {
      const { error } = await sb.from("ops_daily_items").insert(opsItems);
      if (error) console.error("Ops items insert error:", error.message);
    }

    // ─── STEP 4: Publication stats snapshot ───
    console.log("Step 4: Fetching publication stats...");
    try {
      const statsRes = await fetch(
        `${BEEHIIV_BASE}/publications/${PUBLICATION_ID}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        const pub = statsJson.data;

        const snapshot = {
          workspace_id: WORKSPACE_ID,
          publication_id: PUBLICATION_ID,
          active_subscribers: pub.stats?.active_subscriptions ?? pub.active_subscriptions ?? 0,
          all_time_open_rate: pub.stats?.average_open_rate ?? 0,
          all_time_click_rate: pub.stats?.average_click_rate ?? 0,
          new_subscribers: pub.stats?.total_subscriptions ?? 0,
          churned_subscribers: pub.stats?.total_unsubscriptions ?? 0,
          net_subscribers:
            (pub.stats?.total_subscriptions ?? 0) -
            (pub.stats?.total_unsubscriptions ?? 0),
          acquisition_sources: pub.stats?.acquisition_sources ?? null,
          snapshot_date: new Date().toISOString().split("T")[0],
        };

        const { error } = await sb
          .from("beehiiv_publication_snapshots")
          .upsert(snapshot as any, {
            onConflict: "workspace_id,publication_id,snapshot_date",
          });

        if (error) {
          console.error("Snapshot upsert error:", error.message);
        } else {
          console.log("Publication snapshot saved");
        }
      } else {
        console.error("Failed to fetch publication stats:", await statsRes.text());
      }
    } catch (e) {
      console.error("Publication stats error:", e.message);
    }

    // ─── STEP 5: Update sync log ───
    if (syncLogId) {
      await sb
        .from("beehiiv_sync_logs")
        .update({
          subscribers_synced: subscribersSynced,
          new_subscribers_count: newSubscribersCount,
          status_changes_count: statusChangesCount,
          status: "success",
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    // Also update workspace_integrations last_sync_at
    await sb
      .from("workspace_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
      } as any)
      .eq("workspace_id", WORKSPACE_ID)
      .eq("integration_key", "beehiiv");

    const result = {
      ok: true,
      subscribers_synced: subscribersSynced,
      new_subscribers: newSubscribersCount,
      status_changes: statusChangesCount,
      total_from_beehiiv: subscriptions.length,
    };

    console.log("Sync complete:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("beehiiv-subscriber-sync fatal:", e);

    if (syncLogId) {
      await sb
        .from("beehiiv_sync_logs")
        .update({
          status: "failed",
          error_message: e.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

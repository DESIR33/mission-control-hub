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
  stats?: Record<string, unknown>;
}

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
    const params = new URLSearchParams({ ...queryParams, page: String(page), per_page: "100" });
    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Beehiiv API ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const data = json.data as T[];
    if (!data?.length) break;
    items.push(...data);
    if (page >= (json.total_pages ?? Math.ceil((json.total_results ?? 0) / 100))) break;
    page++;
  }
  return items;
}

function computeEngagement(stats: Record<string, unknown> | undefined) {
  const s = stats ?? {};
  const emailsSent = Number(s.total_sent ?? s.total_received ?? s.emails_sent ?? 0);
  const uniqueOpened = Number(s.total_unique_opened ?? 0);
  const totalClicked = Number(s.total_clicked ?? 0);
  const uniqueClicked = Number(s.total_unique_clicked ?? 0);
  let openRate = Number(s.open_rate ?? 0);
  let clickRate = Number(s.click_rate ?? s.click_through_rate ?? 0);
  openRate = Math.round((openRate > 1 ? openRate : openRate * 100) * 10) / 10;
  clickRate = Math.round((clickRate > 1 ? clickRate : clickRate * 100) * 10) / 10;
  return {
    score: Math.min(100, Math.round(openRate * 0.6 + clickRate * 0.4)),
    data: { emails_sent: emailsSent, unique_opens: uniqueOpened, total_clicks: totalClicked, unique_clicks: uniqueClicked, open_rate: openRate, click_rate: clickRate },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("BEEHIIV_API_KEY")!;

  const { data: syncLog } = await sb.from("beehiiv_sync_logs")
    .insert({ workspace_id: WORKSPACE_ID, sync_type: "subscribers", status: "running" })
    .select("id").single();
  const syncLogId = syncLog?.id;

  try {
    // ─── STEP 1: Fetch all Beehiiv subscribers ───
    console.log("Fetching Beehiiv subscribers...");
    const subscriptions = await fetchAllPages<BeehiivSubscription>(
      `${BEEHIIV_BASE}/publications/${PUBLICATION_ID}/subscriptions`, apiKey,
      { "expand[]": "stats" },
    );
    console.log(`Fetched ${subscriptions.length} subscriptions`);

    // Load existing subscribers in one query
    const { data: existingSubs } = await sb.from("subscribers")
      .select("id, email, beehiiv_id, beehiiv_status, status, deleted_at")
      .eq("workspace_id", WORKSPACE_ID);

    const byBeehiivId = new Map((existingSubs ?? []).filter(s => s.beehiiv_id).map(s => [s.beehiiv_id, s]));
    const byEmail = new Map((existingSubs ?? []).map(s => [s.email, s]));

    let subscribersSynced = 0, newCount = 0, statusChanges = 0;
    const activities: Record<string, unknown>[] = [];
    const opsItems: Record<string, unknown>[] = [];
    const unsubReasons: Record<string, unknown>[] = [];

    // Batch upserts in chunks of 50
    const BATCH = 50;
    const upsertRows: Record<string, unknown>[] = [];
    const newInsertRows: Record<string, unknown>[] = [];

    for (const sub of subscriptions) {
      const tier = sub.tier ?? sub.subscription_tier ?? "free";
      const newStatus = mapStatus(sub.status);
      const eng = computeEngagement(sub.stats);
      const existing = byBeehiivId.get(sub.id) ?? byEmail.get(sub.email);

      const row: Record<string, unknown> = {
        workspace_id: WORKSPACE_ID,
        beehiiv_id: sub.id,
        email: sub.email,
        status: newStatus,
        beehiiv_status: sub.status,
        beehiiv_tier: tier,
        source: "beehiiv",
        opt_in_confirmed: sub.status === "active",
        opt_in_confirmed_at: sub.status === "active" ? new Date(sub.created * 1000).toISOString() : null,
        utm_source: sub.utm_source ?? null,
        utm_medium: sub.utm_medium ?? null,
        utm_campaign: sub.utm_campaign ?? null,
        referrer: sub.referrer_url ?? null,
        engagement_score: eng.score,
        engagement_data: eng.data,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Status change detection
        const oldBhStatus = existing.beehiiv_status;
        if (oldBhStatus && oldBhStatus !== sub.status) {
          statusChanges++;
          if (sub.status === "inactive") {
            row.deleted_at = new Date().toISOString();
            unsubReasons.push({
              workspace_id: WORKSPACE_ID, subscriber_id: existing.id,
              reason_category: "beehiiv_status_change",
              reason_text: `Status changed from ${oldBhStatus} to ${sub.status}`,
            });
          }
          if (sub.status === "active" && existing.deleted_at) row.deleted_at = null;
          activities.push({
            workspace_id: WORKSPACE_ID, entity_type: "subscriber", entity_id: existing.id,
            activity_type: "status_change",
            title: `Beehiiv status changed from ${oldBhStatus} to ${sub.status}`,
            description: `Subscriber ${sub.email} updated via sync`,
          });
        }
        // Use upsert with email conflict
        upsertRows.push(row);
      } else {
        row.created_at = new Date(sub.created * 1000).toISOString();
        newInsertRows.push({ ...row, _tier: tier, _email: sub.email });
        newCount++;
      }
      subscribersSynced++;
    }

    // Batch upsert existing subscribers
    for (let i = 0; i < upsertRows.length; i += BATCH) {
      const chunk = upsertRows.slice(i, i + BATCH);
      const { error } = await sb.from("subscribers").upsert(chunk as any, { onConflict: "workspace_id,email" });
      if (error) console.error(`Upsert batch error:`, error.message);
    }

    // Batch insert new subscribers
    for (let i = 0; i < newInsertRows.length; i += BATCH) {
      const chunk = newInsertRows.slice(i, i + BATCH).map(r => {
        const { _tier, _email, ...rest } = r as any;
        return rest;
      });
      const { data: inserted, error } = await sb.from("subscribers").upsert(chunk as any, { onConflict: "workspace_id,email" }).select("id, email");
      if (error) { console.error(`New sub batch error:`, error.message); continue; }

      // Create activity logs for new subs
      for (const ins of inserted ?? []) {
        const original = newInsertRows.find(r => (r as any)._email === ins.email) as any;
        activities.push({
          workspace_id: WORKSPACE_ID, entity_type: "subscriber", entity_id: ins.id,
          activity_type: "new_subscriber", title: `New subscriber from Beehiiv: ${ins.email}`,
          metadata: { source: "beehiiv_sync" },
        });
        if (original?._tier === "premium") {
          opsItems.push({
            workspace_id: WORKSPACE_ID, source_type: "subscriber", source_id: ins.id,
            title: `Premium subscriber: ${ins.email}`, subtitle: "New premium from Beehiiv",
            urgency_score: 70, scored_at: new Date().toISOString(), status: "pending",
          });
        }
      }
    }

    // Batch insert side-effect records
    if (unsubReasons.length) await sb.from("subscriber_unsubscribe_reasons").insert(unsubReasons);
    if (activities.length) await sb.from("activities").insert(activities);
    if (opsItems.length) await sb.from("ops_daily_items").insert(opsItems);

    // ─── STEP 4: Publication stats snapshot ───
    console.log("Fetching publication stats...");
    try {
      const statsRes = await fetch(`${BEEHIIV_BASE}/publications/${PUBLICATION_ID}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (statsRes.ok) {
        const pub = (await statsRes.json()).data;
        await sb.from("beehiiv_publication_snapshots").upsert({
          workspace_id: WORKSPACE_ID, publication_id: PUBLICATION_ID,
          active_subscribers: pub.stats?.active_subscriptions ?? pub.active_subscriptions ?? 0,
          all_time_open_rate: pub.stats?.average_open_rate ?? 0,
          all_time_click_rate: pub.stats?.average_click_rate ?? 0,
          new_subscribers: pub.stats?.total_subscriptions ?? 0,
          churned_subscribers: pub.stats?.total_unsubscriptions ?? 0,
          net_subscribers: (pub.stats?.total_subscriptions ?? 0) - (pub.stats?.total_unsubscriptions ?? 0),
          acquisition_sources: pub.stats?.acquisition_sources ?? null,
          snapshot_date: new Date().toISOString().split("T")[0],
        } as any, { onConflict: "workspace_id,publication_id,snapshot_date" });
        console.log("Snapshot saved");
      } else {
        console.error("Stats fetch failed:", await statsRes.text());
      }
    } catch (e) { console.error("Stats error:", e.message); }

    // ─── STEP 5: Update sync log ───
    if (syncLogId) {
      await sb.from("beehiiv_sync_logs").update({
        subscribers_synced: subscribersSynced, new_subscribers_count: newCount,
        status_changes_count: statusChanges, status: "success",
        completed_at: new Date().toISOString(),
      }).eq("id", syncLogId);
    }

    await sb.from("workspace_integrations").update({
      last_sync_at: new Date().toISOString(), last_sync_error: null,
    } as any).eq("workspace_id", WORKSPACE_ID).eq("integration_key", "beehiiv");

    const result = { ok: true, subscribers_synced: subscribersSynced, new_subscribers: newCount, status_changes: statusChanges };
    console.log("Sync complete:", result);
    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Fatal:", e);
    if (syncLogId) await sb.from("beehiiv_sync_logs").update({ status: "failed", error_message: e.message, completed_at: new Date().toISOString() }).eq("id", syncLogId);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

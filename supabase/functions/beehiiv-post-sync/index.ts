import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";
const WORKSPACE_ID = "ea11b24d-27bd-4488-9760-2663bc788e04";
const PUBLICATION_ID = "pub_035829e7-9d29-4729-9c6f-acaa6e118908";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const wait = Math.min(1000 * Math.pow(2, i), 8000);
      console.warn(`Rate limited, retrying in ${wait}ms...`);
      await delay(wait);
      continue;
    }
    return res;
  }
  return fetch(url, { headers });
}

async function fetchAllPosts(apiKey: string): Promise<any[]> {
  const items: any[] = [];
  let page = 1;
  const authHeaders = { Authorization: `Bearer ${apiKey}` };

  while (true) {
    const params = new URLSearchParams({
      status: "confirmed",
      page: String(page),
      limit: "100",
      "expand[]": "stats",
    });
    const res = await fetchWithRetry(`${BEEHIIV_BASE}/publications/${PUBLICATION_ID}/posts?${params}`, authHeaders);
    if (!res.ok) throw new Error(`Beehiiv posts API ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const data = json.data ?? [];
    if (data.length === 0) break;
    items.push(...data);
    const totalPages = json.total_pages ?? 1;
    if (page >= totalPages) break;
    page++;
  }
  return items;
}

function toISOOrNull(epoch: number | null | undefined): string | null {
  if (!epoch) return null;
  return new Date(epoch * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("BEEHIIV_API_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);
  const authHeaders = { Authorization: `Bearer ${apiKey}` };

  let postsCreated = 0;
  let postsUpdated = 0;
  let statsSynced = 0;
  let linksSynced = 0;
  const errors: string[] = [];

  try {
    // ── STEP 1: Fetch & upsert posts ──
    console.log("Step 1: Fetching posts from Beehiiv...");
    const posts = await fetchAllPosts(apiKey);
    console.log(`Fetched ${posts.length} posts`);

    for (const post of posts) {
      const emailStats = post.stats?.email;
      const webStats = post.stats?.web;

      const row: Record<string, unknown> = {
        workspace_id: WORKSPACE_ID,
        beehiiv_post_id: post.id,
        name: post.title || "Untitled",
        subject: post.subtitle || post.subject_line || post.title || "",
        beehiiv_status: post.status,
        status: "sent",
        audience: post.audience ?? "both",
        publish_date: toISOOrNull(post.publish_date),
        sent_at: toISOOrNull(post.publish_date),
        preview_url: post.preview_url ?? null,
        web_url: post.web_url ?? null,
        beehiiv_created_at: toISOOrNull(post.created),
        beehiiv_updated_at: toISOOrNull(post.updated ?? post.created),
        updated_at: new Date().toISOString(),
      };

      // If stats are expanded inline, map them now
      if (emailStats) {
        Object.assign(row, {
          email_sent_count: emailStats.recipients ?? emailStats.total_sent ?? 0,
          email_delivered_count: emailStats.total_delivered ?? 0,
          email_delivery_rate: emailStats.delivery_rate ?? 0,
          email_suppressions: emailStats.total_suppressions ?? 0,
          email_open_rate: emailStats.open_rate ?? 0,
          email_unique_open_count: emailStats.unique_opens ?? emailStats.total_unique_opened ?? 0,
          email_open_count: emailStats.opens ?? emailStats.total_opened ?? 0,
          email_click_rate: emailStats.click_rate ?? 0,
          email_click_rate_verified: emailStats.click_rate_verified ?? 0,
          email_unique_clicks_raw: emailStats.total_unique_email_clicked_raw ?? 0,
          email_total_clicks_raw: emailStats.total_email_clicked_raw ?? 0,
          email_unique_clicks_verified: emailStats.total_unique_email_clicked_verified ?? 0,
          email_total_clicks_verified: emailStats.total_email_clicked_verified ?? 0,
          email_click_count: emailStats.total_email_clicked_verified ?? emailStats.unique_clicks ?? emailStats.clicks ?? 0,
          email_bounce_rate: emailStats.bounce_rate ?? 0,
          email_soft_bounced: emailStats.total_soft_bounced ?? 0,
          email_hard_bounced: emailStats.total_hard_bounced ?? 0,
          bounced_count: (emailStats.total_soft_bounced ?? 0) + (emailStats.total_hard_bounced ?? 0),
          email_unsubscribe_rate: emailStats.unsubscribe_rate ?? 0,
          unsubscribed_count: emailStats.total_unsubscribes ?? 0,
          email_spam_reported: emailStats.total_spam_reported ?? 0,
          total_recipients: emailStats.recipients ?? emailStats.total_sent ?? 0,
          sent_count: emailStats.recipients ?? emailStats.total_sent ?? 0,
          opened_count: emailStats.unique_opens ?? emailStats.total_unique_opened ?? 0,
          clicked_count: emailStats.total_email_clicked_verified ?? emailStats.unique_clicks ?? 0,
        });
      }

      if (webStats) {
        Object.assign(row, {
          web_view_count: webStats.total_web_viewed ?? webStats.views ?? 0,
          web_click_count: webStats.total_web_clicked ?? 0,
          web_unique_click_count: webStats.total_unique_web_clicked ?? 0,
          web_upgrades: webStats.total_upgrades ?? 0,
        });
      }

      // Check if exists
      const { data: existing } = await sb
        .from("newsletter_issues")
        .select("id")
        .eq("workspace_id", WORKSPACE_ID)
        .eq("beehiiv_post_id", post.id)
        .maybeSingle();

      const { error } = await sb
        .from("newsletter_issues")
        .upsert(row as any, { onConflict: "workspace_id,beehiiv_post_id" });

      if (error) {
        console.error(`Upsert error for ${post.title}:`, error.message);
        errors.push(`Post upsert (${post.title}): ${error.message}`);
      } else {
        if (existing) postsUpdated++;
        else postsCreated++;
      }
    }

    console.log(`Step 1 complete: ${postsCreated} created, ${postsUpdated} updated`);

    // ── STEP 2: Fetch detailed stats for each post ──
    console.log("Step 2: Fetching detailed post stats...");
    const { data: issuesWithBhId } = await sb
      .from("newsletter_issues")
      .select("id, beehiiv_post_id")
      .eq("workspace_id", WORKSPACE_ID)
      .not("beehiiv_post_id", "is", null);

    for (const issue of issuesWithBhId ?? []) {
      try {
        await delay(200); // Rate limit respect
        const res = await fetchWithRetry(
          `${BEEHIIV_BASE}/publications/${PUBLICATION_ID}/posts/${issue.beehiiv_post_id}?expand[]=stats`,
          authHeaders,
        );
        if (!res.ok) {
          const errText = await res.text();
          await sb.from("newsletter_issues").update({ beehiiv_sync_error: `Stats ${res.status}: ${errText}` } as any).eq("id", issue.id);
          errors.push(`Stats for ${issue.beehiiv_post_id}: ${res.status}`);
          continue;
        }
        const json = await res.json();
        const postData = json.data;
        const es = postData?.stats?.email ?? {};
        const ws = postData?.stats?.web ?? {};

        await sb.from("newsletter_issues").update({
          email_sent_count: es.total_sent ?? es.recipients ?? 0,
          email_delivered_count: es.total_delivered ?? 0,
          email_delivery_rate: es.delivery_rate ?? 0,
          email_suppressions: es.total_suppressions ?? 0,
          email_open_rate: es.open_rate ?? 0,
          email_unique_open_count: es.total_unique_opened ?? 0,
          email_open_count: es.total_opened ?? 0,
          email_click_rate: es.click_rate ?? 0,
          email_click_rate_verified: es.click_rate_verified ?? 0,
          email_unique_clicks_raw: es.total_unique_email_clicked_raw ?? 0,
          email_total_clicks_raw: es.total_email_clicked_raw ?? 0,
          email_unique_clicks_verified: es.total_unique_email_clicked_verified ?? 0,
          email_total_clicks_verified: es.total_email_clicked_verified ?? 0,
          email_click_count: es.total_email_clicked_verified ?? 0,
          email_bounce_rate: es.bounce_rate ?? 0,
          email_soft_bounced: es.total_soft_bounced ?? 0,
          email_hard_bounced: es.total_hard_bounced ?? 0,
          bounced_count: (es.total_soft_bounced ?? 0) + (es.total_hard_bounced ?? 0),
          email_unsubscribe_rate: es.unsubscribe_rate ?? 0,
          unsubscribed_count: es.total_unsubscribes ?? 0,
          email_spam_reported: es.total_spam_reported ?? 0,
          total_recipients: es.total_sent ?? 0,
          sent_count: es.total_sent ?? 0,
          opened_count: es.total_unique_opened ?? 0,
          clicked_count: es.total_email_clicked_verified ?? 0,
          web_view_count: ws.total_web_viewed ?? 0,
          web_click_count: ws.total_web_clicked ?? 0,
          web_unique_click_count: ws.total_unique_web_clicked ?? 0,
          web_upgrades: ws.total_upgrades ?? 0,
          beehiiv_last_synced_at: new Date().toISOString(),
          beehiiv_sync_error: null,
          updated_at: new Date().toISOString(),
        } as any).eq("id", issue.id);

        statsSynced++;
      } catch (e) {
        console.error(`Stats error for ${issue.beehiiv_post_id}:`, e.message);
        errors.push(`Stats for ${issue.beehiiv_post_id}: ${e.message}`);
      }
    }
    console.log(`Step 2 complete: ${statsSynced} post stats synced`);

    // ── STEP 3: Sync link clicks ──
    console.log("Step 3: Syncing link clicks...");
    for (const issue of issuesWithBhId ?? []) {
      try {
        await delay(200);
        const res = await fetchWithRetry(
          `${BEEHIIV_BASE}/publications/${PUBLICATION_ID}/posts/${issue.beehiiv_post_id}/clicks`,
          authHeaders,
        );
        if (!res.ok) {
          if (res.status !== 404) errors.push(`Clicks for ${issue.beehiiv_post_id}: ${res.status}`);
          await res.text();
          continue;
        }
        const json = await res.json();
        const clicks = json.data ?? [];

        for (const click of clicks) {
          const { error } = await sb.from("beehiiv_post_link_clicks").upsert({
            workspace_id: WORKSPACE_ID,
            beehiiv_post_id: issue.beehiiv_post_id,
            newsletter_issue_id: issue.id,
            url: click.url,
            total_clicks: click.total_clicks ?? 0,
            unique_clicks: click.unique_clicks ?? 0,
            total_unique_clicks: click.total_unique_clicks ?? 0,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "workspace_id,beehiiv_post_id,url" });

          if (!error) linksSynced++;
        }
      } catch (e) {
        errors.push(`Clicks for ${issue.beehiiv_post_id}: ${e.message}`);
      }
    }
    console.log(`Step 3 complete: ${linksSynced} link click records synced`);

    // ── STEP 4: Log results ──
    const duration = Date.now() - startTime;
    await sb.from("beehiiv_sync_logs").insert({
      workspace_id: WORKSPACE_ID,
      sync_type: "posts_full",
      status: errors.length > 0 ? "partial" : "success",
      subscribers_synced: postsCreated + postsUpdated,
      new_subscribers_count: postsCreated,
      status_changes_count: statsSynced,
      error_message: errors.length > 0 ? errors.join("; ").slice(0, 2000) : null,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    } as any);

    const result = {
      ok: true,
      posts_created: postsCreated,
      posts_updated: postsUpdated,
      stats_synced: statsSynced,
      links_synced: linksSynced,
      duration_ms: duration,
      errors,
    };
    console.log("Sync complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("beehiiv-post-sync fatal:", e);

    await sb.from("beehiiv_sync_logs").insert({
      workspace_id: WORKSPACE_ID,
      sync_type: "posts_full",
      status: "failed",
      error_message: e.message,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    } as any);

    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

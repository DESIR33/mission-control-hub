import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BEEHIIV_BASE = "https://api.beehiiv.com/v2";

interface BeehiivSubscription {
  id: string;
  email: string;
  status: string;
  created: number;
  subscription_tier: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referral_code?: string;
  stats?: {
    emails_sent?: number;
    emails_opened?: number;
    emails_clicked?: number;
    unique_emails_opened?: number;
    unique_emails_clicked?: number;
  };
  custom_fields?: Array<{ name: string; value: string }>;
  tags?: string[];
}

interface BeehiivPost {
  id: string;
  title: string;
  subtitle?: string;
  slug?: string;
  status: string;
  audience: string;
  publish_date?: number;
  displayed_date?: number;
  web_url?: string;
  preview_url?: string;
  stats?: {
    email?: {
      recipients?: number;
      opens?: number;
      unique_opens?: number;
      clicks?: number;
      unique_clicks?: number;
    };
    web?: {
      views?: number;
    };
  };
}

async function fetchAllPages<T>(
  url: string,
  apiKey: string,
  queryParams: Record<string, string> = {}
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({
      ...queryParams,
      page: String(page),
      limit: String(limit),
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

    const totalPages = json.total_pages ?? Math.ceil((json.total_results ?? 0) / limit);
    if (page >= totalPages) break;
    page++;
  }

  return items;
}

function mapBeehiivStatus(status: string): string {
  switch (status) {
    case "active":
      return "active";
    case "inactive":
    case "validating":
      return "inactive";
    case "unsubscribed":
      return "unsubscribed";
    default:
      return "inactive";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["workspace_id required"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch beehiiv config
    const { data: integration, error: intErr } = await sb
      .from("workspace_integrations")
      .select("id, config")
      .eq("workspace_id", workspace_id)
      .eq("integration_key", "beehiiv")
      .eq("enabled", true)
      .single();

    if (intErr || !integration?.config) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["Beehiiv integration not configured or disabled"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = integration.config as Record<string, string>;
    const apiKey = config.api_key;
    const pubId = config.publication_id;

    if (!apiKey || !pubId) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["Missing api_key or publication_id in config"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let syncErrors: string[] = [];
    let subscribersSynced = 0;
    let postsSynced = 0;

    // ──────────────────────────────────────────────
    // 1. SYNC SUBSCRIBERS
    // ──────────────────────────────────────────────
    try {
      const subscriptions = await fetchAllPages<BeehiivSubscription>(
        `${BEEHIIV_BASE}/publications/${pubId}/subscriptions`,
        apiKey,
        { "expand[]": "stats" }
      );

      for (const sub of subscriptions) {
        const rawEmailsSent = (sub.stats as any)?.emails_sent ?? (sub.stats as any)?.emails_received ?? 0;
        const normalizeRate = (value: unknown) => {
          const numeric = typeof value === "number" ? value : Number(value ?? 0);
          if (!Number.isFinite(numeric) || numeric <= 0) return 0;
          const percent = numeric <= 1 ? numeric * 100 : numeric;
          return Math.round(percent * 10) / 10;
        };

        const emailsSent = rawEmailsSent;
        const fallbackOpenRate = normalizeRate((sub.stats as any)?.open_rate);
        const fallbackClickRate = normalizeRate((sub.stats as any)?.click_through_rate);

        const emailsOpened =
          (sub.stats as any)?.emails_opened ??
          (emailsSent > 0 ? Math.round((fallbackOpenRate / 100) * emailsSent) : 0);
        const emailsClicked =
          (sub.stats as any)?.emails_clicked ??
          (emailsSent > 0 ? Math.round((fallbackClickRate / 100) * emailsSent) : 0);

        const uniqueOpened = (sub.stats as any)?.unique_emails_opened ?? emailsOpened;
        const uniqueClicked = (sub.stats as any)?.unique_emails_clicked ?? emailsClicked;
        const openRate =
          emailsSent > 0
            ? Math.round((uniqueOpened / emailsSent) * 1000) / 10
            : fallbackOpenRate;
        const clickRate =
          emailsSent > 0
            ? Math.round((uniqueClicked / emailsSent) * 1000) / 10
            : fallbackClickRate;

        const engData = {
          emails_sent: emailsSent,
          emails_opened: uniqueOpened,
          emails_clicked: uniqueClicked,
          total_opens: emailsOpened,
          total_clicks: emailsClicked,
          unique_opens: uniqueOpened,
          unique_clicks: uniqueClicked,
          open_rate: openRate,
          click_rate: clickRate,
          guides_downloaded: 0,
          last_email_opened_at: null,
          last_clicked_at: null,
        };

        const openScore = Math.max(0, Math.min(100, openRate));
        const clickScore = Math.max(0, Math.min(100, clickRate));
        const engScore = Math.min(100, Math.round(openScore * 0.6 + clickScore * 0.4));

        const row = {
          workspace_id,
          beehiiv_id: sub.id,
          email: sub.email,
          status: mapBeehiivStatus(sub.status),
          beehiiv_status: sub.status,
          beehiiv_tier: sub.subscription_tier ?? null,
          source: "beehiiv" as const,
          utm_source: sub.utm_source ?? null,
          utm_medium: sub.utm_medium ?? null,
          utm_campaign: sub.utm_campaign ?? null,
          engagement_score: engScore,
          engagement_data: engData,
          created_at: new Date(sub.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Upsert by email (handles both new beehiiv subs and pre-existing manual subs)
        const { error } = await sb
          .from("subscribers")
          .upsert(row as any, { onConflict: "workspace_id,email" });

        if (error) {
          console.error(`Subscriber upsert error (${sub.email}):`, error.message);
        } else {
          subscribersSynced++;
        }
      }
    } catch (e) {
      console.error("Subscriber sync error:", e);
      syncErrors.push(`Subscriber sync: ${e.message}`);
    }

    // ──────────────────────────────────────────────
    // 2. SYNC POSTS / NEWSLETTER ISSUES
    // ──────────────────────────────────────────────
    try {
      const posts = await fetchAllPages<BeehiivPost>(
        `${BEEHIIV_BASE}/publications/${pubId}/posts`,
        apiKey,
        { "expand[]": "stats", status: "confirmed" }
      );

      for (const post of posts) {
        const emailStats = post.stats?.email;
        const row = {
          workspace_id,
          beehiiv_post_id: post.id,
          name: post.title || "Untitled",
          subject: post.subtitle || post.title || "",
          status: post.status === "confirmed" ? "sent" : "draft",
          web_url: post.web_url ?? null,
          preview_url: post.preview_url ?? null,
          audience: post.audience ?? "both",
          publish_date: post.publish_date
            ? new Date(post.publish_date * 1000).toISOString()
            : null,
          sent_at: post.publish_date
            ? new Date(post.publish_date * 1000).toISOString()
            : null,
          total_recipients: emailStats?.recipients ?? 0,
          sent_count: emailStats?.recipients ?? 0,
          opened_count: emailStats?.opens ?? 0,
          clicked_count: emailStats?.clicks ?? 0,
          email_sent_count: emailStats?.recipients ?? 0,
          email_open_count: emailStats?.opens ?? 0,
          email_click_count: emailStats?.clicks ?? 0,
          email_unique_open_count: emailStats?.unique_opens ?? 0,
          email_unique_click_count: emailStats?.unique_clicks ?? 0,
          updated_at: new Date().toISOString(),
        };

        const { error } = await sb
          .from("newsletter_issues")
          .upsert(row as any, { onConflict: "workspace_id,beehiiv_post_id" });

        if (error) {
          console.error(`Post upsert error (${post.title}):`, error.message);
        } else {
          postsSynced++;
        }
      }
    } catch (e) {
      console.error("Posts sync error:", e);
      syncErrors.push(`Posts sync: ${e.message}`);
    }

    // ──────────────────────────────────────────────
    // 3. UPDATE SYNC STATUS
    // ──────────────────────────────────────────────
    await sb
      .from("workspace_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_error: syncErrors.length > 0 ? syncErrors.join("; ") : null,
      } as any)
      .eq("id", integration.id);

    return new Response(
      JSON.stringify({
        ok: true,
        subscribers_synced: subscribersSynced,
        posts_synced: postsSynced,
        errors: syncErrors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("beehiiv-sync fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, errors: [e.message] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

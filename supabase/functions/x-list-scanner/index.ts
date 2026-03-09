import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIST_ID = "2026497063500837002";

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
}

interface XUser {
  id: string;
  name: string;
  username: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWITTER_BEARER_TOKEN = Deno.env.get("TWITTER_BEARER_TOKEN");
    if (!TWITTER_BEARER_TOKEN) {
      throw new Error("TWITTER_BEARER_TOKEN is not configured");
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse workspace_id from body
    let workspaceId: string;
    try {
      const body = await req.json();
      workspaceId = body.workspace_id;
    } catch {
      throw new Error("workspace_id is required in request body");
    }

    // Calculate 48 hours ago
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const startTime = fortyEightHoursAgo.toISOString();

    console.log(`Fetching tweets from list ${LIST_ID} since ${startTime}`);

    // Fetch tweets from X list
    const allTweets: Tweet[] = [];
    const allUsers: Map<string, XUser> = new Map();
    let paginationToken: string | undefined;

    // Paginate through results (max 100 per page)
    do {
      const params = new URLSearchParams({
        "tweet.fields": "created_at,public_metrics,author_id",
        "user.fields": "name,username",
        expansions: "author_id",
        max_results: "100",
        start_time: startTime,
      });
      if (paginationToken) {
        params.set("pagination_token", paginationToken);
      }

      const url = `https://api.x.com/2/lists/${LIST_ID}/tweets?${params}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `X API error [${response.status}]: ${errorBody}`
        );
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        // Filter to only tweets within 48h window (API might return slightly outside range)
        for (const tweet of data.data) {
          const tweetDate = new Date(tweet.created_at);
          if (tweetDate >= fortyEightHoursAgo) {
            allTweets.push(tweet);
          }
        }
      }

      // Collect user data
      if (data.includes?.users) {
        for (const user of data.includes.users) {
          allUsers.set(user.id, user);
        }
      }

      paginationToken = data.meta?.next_token;
    } while (paginationToken && allTweets.length < 500);

    console.log(`Fetched ${allTweets.length} tweets from last 48 hours`);

    if (allTweets.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No tweets found in the last 48 hours",
          tweets_analyzed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort by engagement (impressions + likes + retweets)
    allTweets.sort((a, b) => {
      const engA =
        (a.public_metrics?.impression_count || 0) +
        (a.public_metrics?.like_count || 0) * 5 +
        (a.public_metrics?.retweet_count || 0) * 10;
      const engB =
        (b.public_metrics?.impression_count || 0) +
        (b.public_metrics?.like_count || 0) * 5 +
        (b.public_metrics?.retweet_count || 0) * 10;
      return engB - engA;
    });

    // Take top 100 most engaged tweets for analysis
    const topTweets = allTweets.slice(0, 100);

    // Format tweets for AI analysis
    const tweetsSummary = topTweets
      .map((t) => {
        const user = allUsers.get(t.author_id);
        const handle = user ? `@${user.username}` : t.author_id;
        const metrics = t.public_metrics;
        const engagement = metrics
          ? `[❤️${metrics.like_count} 🔁${metrics.retweet_count} 👀${metrics.impression_count}]`
          : "";
        return `${handle}: ${t.text} ${engagement}`;
      })
      .join("\n\n---\n\n");

    // Analyze with AI
    const aiPrompt = `You are a YouTube content strategist for "Hustling Labs", a channel focused on AI tools, automation, SaaS, and tech entrepreneurship.

Analyze these ${topTweets.length} tweets from the last 48 hours (from a curated X list of AI/tech thought leaders) and identify:

1. **Trending Topics** — What themes/tools/products are multiple people talking about?
2. **New Launches** — Any new AI tools, features, or products that just launched?
3. **Controversies/Hot Takes** — Polarizing opinions that could drive engagement?
4. **Tutorial Opportunities** — Tools or workflows people are struggling with?
5. **Breaking News** — Major announcements from big players (OpenAI, Google, Meta, etc.)?

Based on your analysis, propose 3-5 specific video ideas for Hustling Labs, ranked by urgency (time-sensitive first). For each video idea include:
- **Title**: A compelling YouTube title
- **Why Now**: Why this needs to be recorded ASAP
- **Key Angles**: 2-3 bullet points on what to cover
- **Estimated Interest**: High/Medium based on tweet engagement
- **Source Tweets**: Reference the most relevant tweets

Here are the tweets:

${tweetsSummary}`;

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "minimax/minimax-m1",
          messages: [
            {
              role: "system",
              content:
                "You are a sharp YouTube content strategist who identifies trending topics and time-sensitive video opportunities from social media signals. Be specific and actionable.",
            },
            { role: "user", content: aiPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      }
    );

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      throw new Error(`OpenRouter API error [${aiResponse.status}]: ${aiError}`);
    }

    const aiData = await aiResponse.json();
    const analysis =
      aiData.choices?.[0]?.message?.content || "No analysis generated";

    console.log("AI analysis complete");

    // Store as an AI proposal
    const { data: proposal, error: proposalError } = await supabase
      .from("ai_proposals")
      .insert({
        workspace_id: workspaceId,
        title: `🔥 X List Trend Report — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        type: "content_idea",
        proposal_type: "x_trend_scan",
        status: "pending",
        description: `Analyzed ${allTweets.length} tweets from the last 48 hours. Top ${topTweets.length} by engagement were used for trend analysis.`,
        content: {
          analysis,
          scan_time: now.toISOString(),
          tweets_total: allTweets.length,
          tweets_analyzed: topTweets.length,
          top_tweets: topTweets.slice(0, 20).map((t) => ({
            id: t.id,
            text: t.text,
            author: allUsers.get(t.author_id)?.username || t.author_id,
            metrics: t.public_metrics,
            created_at: t.created_at,
          })),
        },
        confidence: 0.85,
        metadata: {
          source: "x_list_scanner",
          list_id: LIST_ID,
          scan_window_hours: 48,
        },
      })
      .select("id")
      .single();

    if (proposalError) {
      console.error("Error saving proposal:", proposalError);
      throw new Error(`Failed to save proposal: ${proposalError.message}`);
    }

    // Create a notification
    await supabase.from("notifications").insert({
      workspace_id: workspaceId,
      title: "🔥 New X Trend Report Ready",
      body: `Analyzed ${allTweets.length} tweets. ${topTweets.length > 50 ? "High activity detected!" : "Review video opportunities."}`,
      type: "x_trend_scan",
      entity_type: "ai_proposal",
      entity_id: proposal.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tweets_fetched: allTweets.length,
        tweets_analyzed: topTweets.length,
        proposal_id: proposal.id,
        message: "Trend report generated and saved as AI proposal",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("X List Scanner error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

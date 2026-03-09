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

interface VideoIdea {
  title: string;
  tool_name: string;
  type: string;
  description: string;
  estimated_views: number;
  content_ideas: string[];
  urgency: string;
  source_tweets: Array<{ author: string; text: string; likes: number; impressions: number }>;
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

    let workspaceId: string;
    try {
      const body = await req.json();
      workspaceId = body.workspace_id;
    } catch {
      throw new Error("workspace_id is required in request body");
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const startTime = fortyEightHoursAgo.toISOString();

    console.log(`Fetching tweets from list ${LIST_ID} since ${startTime}`);

    // Fetch tweets from X list
    const allTweets: Tweet[] = [];
    const allUsers: Map<string, XUser> = new Map();
    let paginationToken: string | undefined;

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
        headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`X API error [${response.status}]: ${errorBody}`);
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        for (const tweet of data.data) {
          const tweetDate = new Date(tweet.created_at);
          if (tweetDate >= fortyEightHoursAgo) {
            allTweets.push(tweet);
          }
        }
      }

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
        JSON.stringify({ success: true, message: "No tweets found in the last 48 hours", tweets_analyzed: 0, ideas: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort by engagement
    allTweets.sort((a, b) => {
      const engA = (a.public_metrics?.impression_count || 0) + (a.public_metrics?.like_count || 0) * 5 + (a.public_metrics?.retweet_count || 0) * 10;
      const engB = (b.public_metrics?.impression_count || 0) + (b.public_metrics?.like_count || 0) * 5 + (b.public_metrics?.retweet_count || 0) * 10;
      return engB - engA;
    });

    const topTweets = allTweets.slice(0, 100);

    // Format tweets for AI
    const tweetsSummary = topTweets
      .map((t) => {
        const user = allUsers.get(t.author_id);
        const handle = user ? `@${user.username}` : t.author_id;
        const m = t.public_metrics;
        const stats = m ? `[❤️${m.like_count} 🔁${m.retweet_count} 👀${m.impression_count}]` : "";
        return `${handle}: ${t.text} ${stats}`;
      })
      .join("\n\n---\n\n");

    // Use tool calling for structured output
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.5",
        messages: [
          {
            role: "system",
            content: `You are a YouTube content strategist for "Hustling Labs", a channel focused on AI tools, automation, SaaS, and tech entrepreneurship. Analyze tweets from the last 48 hours and extract actionable video ideas. Focus on new tool launches, new features, AI breakthroughs, and trending topics. Each idea should be specific and time-sensitive.`,
          },
          {
            role: "user",
            content: `Analyze these ${topTweets.length} tweets from a curated X list and extract video ideas for Hustling Labs. For each idea, identify the specific tool/product, classify the type, estimate total views across all accounts covering this topic, and provide content ideas.\n\nTweets:\n\n${tweetsSummary}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_video_ideas",
              description: "Submit structured video ideas extracted from tweet analysis",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Compelling YouTube video title" },
                        tool_name: { type: "string", description: "Name of the tool, product, or technology" },
                        type: { type: "string", enum: ["New Tool", "New Feature", "AI Launch", "Industry Trend", "Tutorial Opportunity", "Breaking News", "Hot Take"], description: "Category of the content" },
                        description: { type: "string", description: "2-3 sentence description of what the video should cover" },
                        estimated_views: { type: "number", description: "Estimated total views across all accounts/posts covering this topic in the last 48 hours" },
                        content_ideas: { type: "array", items: { type: "string" }, description: "3-5 specific content angles or segments to include" },
                        urgency: { type: "string", enum: ["high", "medium", "low"], description: "How time-sensitive this idea is" },
                        source_tweets: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              author: { type: "string" },
                              text: { type: "string" },
                              likes: { type: "number" },
                              impressions: { type: "number" },
                            },
                            required: ["author", "text", "likes", "impressions"],
                          },
                          description: "The most relevant source tweets for this idea",
                        },
                      },
                      required: ["title", "tool_name", "type", "description", "estimated_views", "content_ideas", "urgency", "source_tweets"],
                    },
                  },
                },
                required: ["ideas"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_video_ideas" } },
        max_tokens: 6000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      throw new Error(`OpenRouter API error [${aiResponse.status}]: ${aiError}`);
    }

    const aiData = await aiResponse.json();

    // Extract structured ideas from tool call
    let ideas: VideoIdea[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        ideas = parsed.ideas || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
        // Fallback: try content
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          ideas = [{ title: "Trend Analysis", tool_name: "Various", type: "Industry Trend", description: content, estimated_views: 0, content_ideas: [], urgency: "medium", source_tweets: [] }];
        }
      }
    }

    console.log(`AI extracted ${ideas.length} video ideas`);

    // Store the scan report as an AI proposal
    const { data: proposal, error: proposalError } = await supabase
      .from("ai_proposals")
      .insert({
        workspace_id: workspaceId,
        title: `🔥 X Trend Report — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        type: "content_idea",
        proposal_type: "x_trend_scan",
        status: "pending",
        description: `Analyzed ${allTweets.length} tweets from the last 48 hours. Extracted ${ideas.length} video ideas.`,
        content: {
          ideas,
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
          ideas_count: ideas.length,
        },
      })
      .select("id")
      .single();

    if (proposalError) {
      console.error("Error saving proposal:", proposalError);
      throw new Error(`Failed to save proposal: ${proposalError.message}`);
    }

    // Create a notification PER idea
    const notifications = ideas.map((idea) => ({
      workspace_id: workspaceId,
      title: `💡 New Video Idea: ${idea.tool_name}`,
      body: idea.title,
      type: "x_trend_idea",
      entity_type: "ai_proposal",
      entity_id: proposal.id,
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase.from("notifications").insert(notifications);
      if (notifError) console.error("Error creating notifications:", notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tweets_fetched: allTweets.length,
        tweets_analyzed: topTweets.length,
        ideas_count: ideas.length,
        proposal_id: proposal.id,
        ideas,
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

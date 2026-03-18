import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useChannelStats } from "@/hooks/use-youtube-analytics";
import type { CompetitorSponsor } from "@/hooks/use-competitor-sponsors";

export interface OutreachEmailResult {
  subject: string;
  body: string;
}

export function useGenerateOutreachEmail() {
  const { workspaceId } = useWorkspace();
  const { data: channelStats } = useChannelStats();

  return useMutation({
    mutationFn: async ({
      sponsor,
      tone,
      additionalContext,
    }: {
      sponsor: CompetitorSponsor;
      tone: "professional" | "casual" | "bold";
      additionalContext?: string;
    }): Promise<OutreachEmailResult> => {
      const openrouterKey = await getOpenRouterKey(workspaceId!);

      const channelContext = channelStats
        ? `Channel Stats: ${channelStats.subscriber_count.toLocaleString()} subscribers, ${channelStats.video_count} videos, ${channelStats.total_view_count.toLocaleString()} total views.`
        : "Channel Stats: Growing YouTube channel with an engaged audience.";

      const competitorContext = sponsor.competitor_channels?.length
        ? `${sponsor.sponsor_name} currently sponsors ${sponsor.competitor_channels.length} competitor channel(s): ${sponsor.competitor_channels.slice(0, 5).join(", ")}.`
        : "";

      const mentionContext = `They've been mentioned ${sponsor.mention_count} time(s) across competitor content.`;
      const detectionContext = `Detected via: ${sponsor.detection_method}.`;

      const toneInstructions: Record<string, string> = {
        professional: "Write in a professional, business-like tone. Be respectful and concise.",
        casual: "Write in a friendly, conversational tone. Be personable and warm, but still professional.",
        bold: "Write in a confident, attention-grabbing tone. Lead with value and be direct about what you bring to the table.",
      };

      const prompt = `You are an expert sponsorship outreach specialist for YouTube creators. Generate a personalized cold outreach email to pitch a sponsorship deal.

CONTEXT:
- ${channelContext}
- ${competitorContext}
- ${mentionContext}
- ${detectionContext}
- Sponsor website: ${sponsor.sponsor_url || "Unknown"}
${additionalContext ? `- Additional context from the creator: ${additionalContext}` : ""}

TONE: ${toneInstructions[tone]}

STRATEGY:
- Reference that you noticed they sponsor similar channels (competitors) — this shows you've done your research
- Highlight what makes your channel/audience unique and valuable
- Include a specific, compelling value proposition
- Keep the email concise (under 200 words for the body)
- End with a clear, low-friction call to action

Return ONLY a JSON object with two keys:
- "subject": The email subject line (compelling, under 60 characters)
- "body": The full email body (with proper paragraphs, no HTML)

Do NOT include any text outside the JSON object.`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        // Fallback to local template
        return generateLocalOutreach(sponsor, channelStats, tone);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.subject && parsed.body) return parsed;
        }
      } catch {
        // parse failed
      }

      return generateLocalOutreach(sponsor, channelStats, tone);
    },
  });
}

async function getOpenRouterKey(workspaceId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("integration-config-read", {
    body: { workspace_id: workspaceId, integration_key: "openrouter" },
  });

  if (error) throw new Error("AI generation unavailable — using template fallback");
  const config = data?.raw_non_secret;
  if (config?.api_key) return config.api_key;

  throw new Error("AI generation unavailable — using template fallback");
}

function generateLocalOutreach(
  sponsor: CompetitorSponsor,
  channelStats: { subscriber_count: number; video_count: number; total_view_count: number } | null | undefined,
  tone: "professional" | "casual" | "bold",
): OutreachEmailResult {
  const subs = channelStats?.subscriber_count
    ? `${(channelStats.subscriber_count / 1000).toFixed(0)}K+`
    : "a growing";
  const views = channelStats?.total_view_count
    ? `${(channelStats.total_view_count / 1_000_000).toFixed(1)}M+`
    : "strong";
  const competitors = sponsor.competitor_channels?.slice(0, 3).join(", ") || "similar channels";

  const templates: Record<string, OutreachEmailResult> = {
    professional: {
      subject: `Sponsorship Opportunity — ${sponsor.sponsor_name} x Our Channel`,
      body: `Dear ${sponsor.sponsor_name} Team,

I hope this email finds you well. I'm reaching out because I noticed your brand's presence across several channels in our space, including ${competitors}, and I believe there's a strong opportunity for us to work together.

I run a YouTube channel with ${subs} subscribers and ${views} total views, focused on content that aligns well with your brand's target audience.

What I can offer:
• Dedicated or integrated sponsorship segments
• Authentic product showcases tailored to an engaged, high-intent audience
• Detailed campaign analytics and performance reporting

I'd welcome the opportunity to discuss how we can create a partnership that delivers real results for ${sponsor.sponsor_name}. Would you have 15 minutes for a quick call this week?

Looking forward to hearing from you.

Best regards`,
    },
    casual: {
      subject: `Hey ${sponsor.sponsor_name} — Let's create something awesome together!`,
      body: `Hey ${sponsor.sponsor_name} team! 👋

I've been a fan of what you're doing, and I noticed you're already working with creators like ${competitors} — so I figured I'd reach out!

I run a YouTube channel with ${subs} subscribers and ${views} total views. My audience is super engaged and right in your wheelhouse.

I'd love to chat about doing a sponsorship together — whether that's a dedicated video, an integration, or something creative we cook up together.

Want to hop on a quick call this week? I promise I'll keep it short and sweet 😄

Cheers!`,
    },
    bold: {
      subject: `${sponsor.sponsor_name}: Your competitors are getting results — let's talk`,
      body: `${sponsor.sponsor_name} Team,

Your brand is already sponsoring ${competitors}. That's smart — but you're missing a key audience segment that I can unlock.

My channel: ${subs} subscribers, ${views} total views, and an audience with serious purchasing intent. My sponsored content consistently delivers above-average engagement because I only partner with brands I genuinely believe in.

Here's what I'm proposing:
• A pilot campaign — one integrated sponsorship with full analytics
• Zero risk — if the metrics don't impress you, no obligation to continue

I have three sponsor slots available this quarter. Let's get 15 minutes on the calendar before they're filled.

Talk soon`,
    },
  };

  return templates[tone] || templates.professional;
}

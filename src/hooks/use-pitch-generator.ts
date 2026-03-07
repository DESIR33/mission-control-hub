import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export function usePitchGenerator() {
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (args: {
      companyName: string;
      companyId: string;
      matchScore: number;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "ai-generate-proposals",
        {
          body: {
            workspace_id: workspaceId,
            type: "sponsor_pitch",
            context: {
              company_name: args.companyName,
              match_score: args.matchScore,
            },
          },
        }
      );
      if (error) {
        return generateLocalPitch(args.companyName, args.matchScore);
      }
      return data?.pitch ?? generateLocalPitch(args.companyName, args.matchScore);
    },
  });
}

function generateLocalPitch(companyName: string, matchScore: number): string {
  const enthusiasm =
    matchScore >= 80
      ? "I believe there's an incredibly strong alignment between our audiences"
      : matchScore >= 60
        ? "I see a great potential fit between our communities"
        : "I think there could be an interesting opportunity for collaboration";

  return `Hi ${companyName} Team,

I run Hustling Labs, a YouTube channel focused on tech, AI, and productivity with a highly engaged audience of 21K+ subscribers and growing.

${enthusiasm}, and I'd love to explore a sponsorship partnership.

Here's what I can offer:
- Dedicated video integration (60-90 second mid-roll or full dedicated review)
- Authentic, story-driven product showcase tailored to my audience
- Cross-promotion across YouTube, newsletter, and social channels
- Detailed performance analytics and audience demographic reports

My audience demographics:
- 78% male, ages 25-44
- Heavy interest in productivity tools, SaaS, and AI products
- High purchasing intent (avg. CTR on sponsored links: 4.2%)

I'd love to hop on a quick call to discuss how we can create something impactful together. Would you have 15 minutes this week?

Best regards,
Hustling Labs`;
}

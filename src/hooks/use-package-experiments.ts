import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useChannelStats } from "@/hooks/use-youtube-analytics";
import { useDeals, type Deal } from "@/hooks/use-deals";
import { useMemo } from "react";

const q = (table: string) => (supabase as any).from(table);

export interface PackageExperiment {
  id: string;
  workspace_id: string;
  opportunity_id: string | null;
  company_id: string | null;
  company_name: string;
  recommended_package: string;
  recommended_value: number;
  channel_subscribers: number;
  channel_views: number;
  channel_video_count: number;
  avg_view_duration: number;
  avg_ctr: number;
  sponsor_vertical: string | null;
  match_score: number;
  historical_win_rate: number;
  historical_avg_deal: number;
  past_deal_count: number;
  package_rationale: string | null;
  outcome: string;
  rejection_reason: string | null;
  accepted_package: string | null;
  accepted_value: number | null;
  outcome_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface SmartPackageRecommendation {
  package: string;
  suggestedValue: number;
  rationale: string;
  confidence: number;
  alternatives: { package: string; value: number; reason: string }[];
}

// Rate card base pricing (from memory)
const RATE_CARD: Record<string, { base: number; label: string }> = {
  premium: { base: 425, label: "Premium — Full integration bundle" },
  standard: { base: 350, label: "Standard — Dedicated video + newsletter" },
  starter: { base: 275, label: "Starter — Single mention or trial" },
  explorer: { base: 150, label: "Explorer — Lightweight trial placement" },
};

/**
 * Smart package recommender using historical outcomes, channel metrics, and deal data.
 * Learns from past experiment outcomes to improve future recommendations.
 */
export function useSmartPackageRecommender() {
  const { workspaceId } = useWorkspace();
  const { data: channelStats } = useChannelStats();
  const { data: deals = [] } = useDeals();
  const { data: experiments = [] } = usePackageExperiments();

  return useMemo(() => {
    // Build learning model from past experiment outcomes
    const learnings = buildLearningModel(experiments);

    return function recommend(
      companyName: string,
      vertical: string,
      matchScore: number,
      winRate: number,
      avgDealValue: number,
      pastDealCount: number
    ): SmartPackageRecommendation {
      const subs = channelStats?.subscriber_count ?? 0;
      const views = channelStats?.total_view_count ?? 0;
      const videoCount = channelStats?.video_count ?? 0;

      // Channel tier multiplier
      const channelTier = subs >= 100000 ? 2.5 : subs >= 50000 ? 2.0 : subs >= 10000 ? 1.5 : 1.0;
      const viewsPerVideo = videoCount > 0 ? views / videoCount : 0;
      const viewMultiplier = viewsPerVideo >= 50000 ? 1.5 : viewsPerVideo >= 10000 ? 1.2 : 1.0;

      // Base composite score
      let composite = matchScore * 0.3 + winRate * 25 + Math.min(avgDealValue / 100, 25) + pastDealCount * 3;

      // Apply learnings: adjust based on vertical acceptance rates
      const verticalLearning = learnings.verticalAcceptance.get(vertical);
      if (verticalLearning) {
        composite += (verticalLearning.acceptRate - 0.5) * 20; // Boost/penalize based on historical acceptance
      }

      // Package-level learning: if a package is frequently rejected, shift recommendation
      const packageRejections = learnings.packageRejectionRate;

      // Determine recommended package
      let pkg: string;
      if (composite >= 70) pkg = "premium";
      else if (composite >= 45) pkg = "standard";
      else if (composite >= 25) pkg = "starter";
      else pkg = "explorer";

      // Adjust if historical data shows this package gets rejected often for this vertical
      const rejRate = packageRejections.get(`${pkg}:${vertical}`) ?? 0;
      if (rejRate > 0.6 && pkg !== "explorer") {
        // Downgrade one tier
        const tiers = ["premium", "standard", "starter", "explorer"];
        const idx = tiers.indexOf(pkg);
        if (idx < tiers.length - 1) pkg = tiers[idx + 1];
      }

      // Calculate value based on rate card, channel tier, and historical pricing
      const baseValue = RATE_CARD[pkg]?.base ?? 275;
      let suggestedValue = Math.round(baseValue * channelTier * viewMultiplier);

      // Adjust toward historical avg if they have past deals
      if (avgDealValue > 0 && pastDealCount >= 2) {
        suggestedValue = Math.round(suggestedValue * 0.4 + avgDealValue * 0.6);
      }

      // Apply learned average accepted values for this vertical
      const avgAccepted = learnings.avgAcceptedValue.get(vertical);
      if (avgAccepted && avgAccepted > 0) {
        suggestedValue = Math.round(suggestedValue * 0.6 + avgAccepted * 0.4);
      }

      // Build rationale
      const parts: string[] = [];
      parts.push(`Match score ${matchScore}/100`);
      if (pastDealCount > 0) parts.push(`${pastDealCount} past deals (${winRate}% win rate)`);
      if (subs > 0) parts.push(`${(subs / 1000).toFixed(0)}K subscribers (${channelTier}x tier)`);
      if (verticalLearning) parts.push(`${vertical} vertical: ${Math.round(verticalLearning.acceptRate * 100)}% acceptance history`);
      if (rejRate > 0.3) parts.push(`Adjusted for ${Math.round(rejRate * 100)}% past rejection rate`);

      const confidence = Math.min(95, Math.round(
        40 + pastDealCount * 5 + (verticalLearning?.sampleSize ?? 0) * 3 + (matchScore > 60 ? 15 : 0)
      ));

      // Build alternatives
      const tiers = ["premium", "standard", "starter", "explorer"];
      const alternatives = tiers
        .filter(t => t !== pkg)
        .slice(0, 2)
        .map(t => ({
          package: t,
          value: Math.round((RATE_CARD[t]?.base ?? 200) * channelTier * viewMultiplier),
          reason: RATE_CARD[t]?.label ?? t,
        }));

      return {
        package: pkg,
        suggestedValue,
        rationale: parts.join(" · "),
        confidence,
        alternatives,
      };
    };
  }, [channelStats, deals, experiments]);
}

function buildLearningModel(experiments: PackageExperiment[]) {
  const resolved = experiments.filter(e => e.outcome !== "pending");

  // Vertical acceptance rates
  const verticalAcceptance = new Map<string, { acceptRate: number; sampleSize: number }>();
  const verticalGroups = new Map<string, { accepted: number; total: number }>();
  for (const e of resolved) {
    const v = e.sponsor_vertical ?? "General";
    const g = verticalGroups.get(v) ?? { accepted: 0, total: 0 };
    g.total++;
    if (e.outcome === "accepted" || e.outcome === "counter_offered") g.accepted++;
    verticalGroups.set(v, g);
  }
  for (const [v, g] of verticalGroups) {
    verticalAcceptance.set(v, { acceptRate: g.total > 0 ? g.accepted / g.total : 0.5, sampleSize: g.total });
  }

  // Package rejection rates by vertical
  const packageRejectionRate = new Map<string, number>();
  const pkgVerticalGroups = new Map<string, { rejected: number; total: number }>();
  for (const e of resolved) {
    const key = `${e.recommended_package}:${e.sponsor_vertical ?? "General"}`;
    const g = pkgVerticalGroups.get(key) ?? { rejected: 0, total: 0 };
    g.total++;
    if (e.outcome === "rejected") g.rejected++;
    pkgVerticalGroups.set(key, g);
  }
  for (const [key, g] of pkgVerticalGroups) {
    packageRejectionRate.set(key, g.total > 0 ? g.rejected / g.total : 0);
  }

  // Average accepted values by vertical
  const avgAcceptedValue = new Map<string, number>();
  const verticalValues = new Map<string, number[]>();
  for (const e of resolved) {
    if ((e.outcome === "accepted" || e.outcome === "counter_offered") && (e.accepted_value ?? e.recommended_value) > 0) {
      const v = e.sponsor_vertical ?? "General";
      const arr = verticalValues.get(v) ?? [];
      arr.push(e.accepted_value ?? e.recommended_value);
      verticalValues.set(v, arr);
    }
  }
  for (const [v, vals] of verticalValues) {
    avgAcceptedValue.set(v, vals.reduce((s, v) => s + v, 0) / vals.length);
  }

  return { verticalAcceptance, packageRejectionRate, avgAcceptedValue };
}

export function usePackageExperiments(outcomeFilter?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["package-experiments", workspaceId, outcomeFilter],
    queryFn: async (): Promise<PackageExperiment[]> => {
      if (!workspaceId) return [];
      let query = q("sponsor_package_experiments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (outcomeFilter) query = query.eq("outcome", outcomeFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PackageExperiment[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreatePackageExperiment() {
  const { workspaceId } = useWorkspace();
  const { data: channelStats } = useYouTubeChannelStats();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      opportunity_id?: string;
      company_id?: string;
      company_name: string;
      recommended_package: string;
      recommended_value: number;
      sponsor_vertical?: string;
      match_score: number;
      historical_win_rate: number;
      historical_avg_deal: number;
      past_deal_count: number;
      package_rationale?: string;
      avg_ctr?: number;
      avg_view_duration?: number;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await q("sponsor_package_experiments").insert({
        workspace_id: workspaceId,
        ...input,
        channel_subscribers: channelStats?.subscriber_count ?? 0,
        channel_views: channelStats?.total_view_count ?? 0,
        channel_video_count: channelStats?.video_count ?? 0,
        avg_view_duration: input.avg_view_duration ?? 0,
        avg_ctr: input.avg_ctr ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["package-experiments"] }),
  });
}

export function useResolvePackageExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      outcome: "accepted" | "rejected" | "counter_offered";
      rejection_reason?: string;
      accepted_package?: string;
      accepted_value?: number;
      outcome_notes?: string;
    }) => {
      const { error } = await q("sponsor_package_experiments")
        .update({
          outcome: input.outcome,
          rejection_reason: input.rejection_reason ?? null,
          accepted_package: input.accepted_package ?? null,
          accepted_value: input.accepted_value ?? null,
          outcome_notes: input.outcome_notes ?? null,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["package-experiments"] }),
  });
}

export function useExperimentInsights() {
  const { data: experiments = [] } = usePackageExperiments();

  return useMemo(() => {
    const resolved = experiments.filter(e => e.outcome !== "pending");
    if (resolved.length === 0) return null;

    const accepted = resolved.filter(e => e.outcome === "accepted" || e.outcome === "counter_offered");
    const rejected = resolved.filter(e => e.outcome === "rejected");
    const acceptRate = resolved.length > 0 ? accepted.length / resolved.length : 0;

    // Average recommended vs accepted value
    const avgRecommended = accepted.length > 0
      ? accepted.reduce((s, e) => s + e.recommended_value, 0) / accepted.length : 0;
    const avgAccepted = accepted.filter(e => e.accepted_value).length > 0
      ? accepted.filter(e => e.accepted_value).reduce((s, e) => s + (e.accepted_value ?? 0), 0) / accepted.filter(e => e.accepted_value).length : 0;

    // Top rejection reasons
    const reasonCounts = new Map<string, number>();
    for (const e of rejected) {
      const reason = e.rejection_reason ?? "No reason given";
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // Best performing package
    const pkgAcceptance = new Map<string, { accepted: number; total: number }>();
    for (const e of resolved) {
      const g = pkgAcceptance.get(e.recommended_package) ?? { accepted: 0, total: 0 };
      g.total++;
      if (e.outcome === "accepted" || e.outcome === "counter_offered") g.accepted++;
      pkgAcceptance.set(e.recommended_package, g);
    }
    const bestPackage = Array.from(pkgAcceptance.entries())
      .filter(([, g]) => g.total >= 2)
      .sort((a, b) => (b[1].accepted / b[1].total) - (a[1].accepted / a[1].total))[0];

    return {
      totalExperiments: resolved.length,
      acceptRate,
      avgRecommended: Math.round(avgRecommended),
      avgAccepted: Math.round(avgAccepted),
      valueAccuracy: avgAccepted > 0 && avgRecommended > 0
        ? Math.round((1 - Math.abs(avgAccepted - avgRecommended) / avgRecommended) * 100) : null,
      topReasons,
      bestPackage: bestPackage ? { name: bestPackage[0], rate: bestPackage[1].accepted / bestPackage[1].total } : null,
      pending: experiments.filter(e => e.outcome === "pending").length,
    };
  }, [experiments]);
}

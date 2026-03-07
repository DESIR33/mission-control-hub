import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";

export interface ABTest {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  video_title?: string;
  test_type: "title" | "thumbnail";
  variant_a: string;
  variant_b: string;
  variant_a_ctr?: number;
  variant_b_ctr?: number;
  variant_a_views?: number;
  variant_b_views?: number;
  winner?: string | null;
  status: "active" | "completed";
  started_at: string;
  ended_at?: string | null;
  created_at: string;
}

export interface RefreshCandidate {
  youtube_video_id: string;
  video_title: string;
  impressions: number;
  ctr: number;
  views: number;
}

export interface ABLearning {
  category: string;
  insight: string;
  dataPoints: number;
}

export function useABTestingDashboard() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const testsQuery = useQuery({
    queryKey: ["video-ab-tests", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_ab_tests" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ABTest[];
    },
    enabled: !!workspaceId,
  });

  const analyticsQuery = useQuery({
    queryKey: ["ab-testing-analytics", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("youtube_video_id, video_title, impressions, ctr, views, date")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const activeTests = useMemo(
    () => (testsQuery.data ?? []).filter((t) => t.status === "active"),
    [testsQuery.data]
  );

  const completedTests = useMemo(
    () => (testsQuery.data ?? []).filter((t) => t.status === "completed"),
    [testsQuery.data]
  );

  const learnings = useMemo((): ABLearning[] => {
    const completed = completedTests;
    if (!completed.length) return [];

    const insights: ABLearning[] = [];

    // Pattern: question vs statement titles
    const titleTests = completed.filter((t) => t.test_type === "title");
    if (titleTests.length >= 2) {
      const questionCTRs: number[] = [];
      const statementCTRs: number[] = [];

      titleTests.forEach((t) => {
        const aIsQuestion = t.variant_a.includes("?");
        const bIsQuestion = t.variant_b.includes("?");
        if (aIsQuestion && t.variant_a_ctr) questionCTRs.push(t.variant_a_ctr);
        if (!aIsQuestion && t.variant_a_ctr) statementCTRs.push(t.variant_a_ctr);
        if (bIsQuestion && t.variant_b_ctr) questionCTRs.push(t.variant_b_ctr);
        if (!bIsQuestion && t.variant_b_ctr) statementCTRs.push(t.variant_b_ctr);
      });

      if (questionCTRs.length && statementCTRs.length) {
        const avgQ = (questionCTRs.reduce((s, v) => s + v, 0) / questionCTRs.length).toFixed(1);
        const avgS = (statementCTRs.reduce((s, v) => s + v, 0) / statementCTRs.length).toFixed(1);
        insights.push({
          category: "Title Style",
          insight: `Question titles avg ${avgQ}% CTR vs Statement titles avg ${avgS}% CTR`,
          dataPoints: titleTests.length,
        });
      }
    }

    // Pattern: thumbnail tests with "face" keywords
    const thumbTests = completed.filter((t) => t.test_type === "thumbnail");
    if (thumbTests.length >= 2) {
      const faceCTRs: number[] = [];
      const noFaceCTRs: number[] = [];

      thumbTests.forEach((t) => {
        const aHasFace = /face|person|portrait|reaction|expression/i.test(t.variant_a);
        const bHasFace = /face|person|portrait|reaction|expression/i.test(t.variant_b);
        if (aHasFace && t.variant_a_ctr) faceCTRs.push(t.variant_a_ctr);
        if (!aHasFace && t.variant_a_ctr) noFaceCTRs.push(t.variant_a_ctr);
        if (bHasFace && t.variant_b_ctr) faceCTRs.push(t.variant_b_ctr);
        if (!bHasFace && t.variant_b_ctr) noFaceCTRs.push(t.variant_b_ctr);
      });

      if (faceCTRs.length && noFaceCTRs.length) {
        const avgFace = faceCTRs.reduce((s, v) => s + v, 0) / faceCTRs.length;
        const avgNoFace = noFaceCTRs.reduce((s, v) => s + v, 0) / noFaceCTRs.length;
        const diff = (((avgFace - avgNoFace) / avgNoFace) * 100).toFixed(0);
        insights.push({
          category: "Thumbnails",
          insight: `Faces in thumbnails: avg ${diff}% higher CTR`,
          dataPoints: thumbTests.length,
        });
      }
    }

    // Pattern: winning variant length
    const titleWins = titleTests.filter((t) => t.winner);
    if (titleWins.length >= 2) {
      let shorterWins = 0;
      titleWins.forEach((t) => {
        const winnerText = t.winner === "a" ? t.variant_a : t.variant_b;
        const loserText = t.winner === "a" ? t.variant_b : t.variant_a;
        if (winnerText.length < loserText.length) shorterWins++;
      });
      const pct = ((shorterWins / titleWins.length) * 100).toFixed(0);
      insights.push({
        category: "Title Length",
        insight: `Shorter titles won ${pct}% of the time (${shorterWins}/${titleWins.length} tests)`,
        dataPoints: titleWins.length,
      });
    }

    return insights;
  }, [completedTests]);

  // Refresh candidates: videos with >1000 impressions but <3% CTR
  const refreshCandidates = useMemo((): RefreshCandidate[] => {
    const analytics = analyticsQuery.data ?? [];
    if (!analytics.length) return [];

    // Aggregate by video
    const videoMap = new Map<string, { title: string; impressions: number; clicks: number; views: number }>();
    analytics.forEach((a: any) => {
      const existing = videoMap.get(a.youtube_video_id) ?? {
        title: a.video_title ?? "Untitled",
        impressions: 0,
        clicks: 0,
        views: 0,
      };
      existing.impressions += Number(a.impressions ?? 0);
      existing.views += Number(a.views ?? 0);
      videoMap.set(a.youtube_video_id, existing);
    });

    // Get latest CTR per video
    const latestCTR = new Map<string, number>();
    analytics.forEach((a: any) => {
      if (!latestCTR.has(a.youtube_video_id)) {
        latestCTR.set(a.youtube_video_id, Number(a.ctr ?? 0));
      }
    });

    return Array.from(videoMap.entries())
      .filter(([id, v]) => v.impressions > 1000 && (latestCTR.get(id) ?? 0) < 3)
      .map(([id, v]) => ({
        youtube_video_id: id,
        video_title: v.title,
        impressions: v.impressions,
        ctr: latestCTR.get(id) ?? 0,
        views: v.views,
      }))
      .sort((a, b) => a.ctr - b.ctr)
      .slice(0, 10);
  }, [analyticsQuery.data]);

  const createTest = useMutation({
    mutationFn: async (test: {
      youtube_video_id: string;
      video_title?: string;
      test_type: "title" | "thumbnail";
      variant_a: string;
      variant_b: string;
    }) => {
      const { data, error } = await supabase
        .from("video_ab_tests" as any)
        .insert({
          workspace_id: workspaceId,
          youtube_video_id: test.youtube_video_id,
          video_title: test.video_title ?? "",
          test_type: test.test_type,
          variant_a: test.variant_a,
          variant_b: test.variant_b,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-ab-tests"] }),
  });

  const endTest = useMutation({
    mutationFn: async ({ testId, winner }: { testId: string; winner: "a" | "b" }) => {
      const { data, error } = await supabase
        .from("video_ab_tests" as any)
        .update({
          status: "completed",
          winner,
          ended_at: new Date().toISOString(),
        })
        .eq("id", testId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-ab-tests"] }),
  });

  return {
    tests: testsQuery.data ?? [],
    activeTests,
    completedTests,
    learnings,
    refreshCandidates,
    isLoading: testsQuery.isLoading || analyticsQuery.isLoading,
    createTest,
    endTest,
  };
}

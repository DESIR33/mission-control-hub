import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoAbTest {
  id: string;
  workspace_id: string;
  video_queue_id: number | null;
  youtube_video_id: string | null;
  test_type: "title" | "thumbnail";
  variant_a: string;
  variant_b: string;
  variant_a_ctr: number | null;
  variant_b_ctr: number | null;
  variant_a_views: number | null;
  variant_b_views: number | null;
  started_at: string | null;
  ended_at: string | null;
  winner: "a" | "b" | "inconclusive" | null;
  notes: string | null;
  created_at: string;
}

export function useAbTests(videoQueueId?: number | string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["ab-tests", workspaceId, videoQueueId],
    queryFn: async (): Promise<VideoAbTest[]> => {
      let query = supabase
        .from("video_ab_tests" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (videoQueueId) query = query.eq("video_queue_id", String(videoQueueId));
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as VideoAbTest[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateAbTest() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      videoQueueId?: number | string;
      youtubeVideoId?: string;
      testType: "title" | "thumbnail";
      variantA: string;
      variantB: string;
      variantACtr?: number;
      variantBCtr?: number;
      variantAViews?: number;
      variantBViews?: number;
      startedAt?: string;
      endedAt?: string;
      winner?: "a" | "b" | "inconclusive";
      notes?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("video_ab_tests" as any).insert({
        workspace_id: workspaceId,
        video_queue_id: input.videoQueueId ? Number(input.videoQueueId) : null,
        youtube_video_id: input.youtubeVideoId ?? null,
        test_type: input.testType,
        variant_a: input.variantA,
        variant_b: input.variantB,
        variant_a_ctr: input.variantACtr ?? null,
        variant_b_ctr: input.variantBCtr ?? null,
        variant_a_views: input.variantAViews ?? null,
        variant_b_views: input.variantBViews ?? null,
        started_at: input.startedAt ?? null,
        ended_at: input.endedAt ?? null,
        winner: input.winner ?? null,
        notes: input.notes ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ab-tests", workspaceId] }),
  });
}

export function useUpdateAbTest() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      variantACtr?: number;
      variantBCtr?: number;
      variantAViews?: number;
      variantBViews?: number;
      endedAt?: string;
      winner?: "a" | "b" | "inconclusive";
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.variantACtr !== undefined) updates.variant_a_ctr = input.variantACtr;
      if (input.variantBCtr !== undefined) updates.variant_b_ctr = input.variantBCtr;
      if (input.variantAViews !== undefined) updates.variant_a_views = input.variantAViews;
      if (input.variantBViews !== undefined) updates.variant_b_views = input.variantBViews;
      if (input.endedAt !== undefined) updates.ended_at = input.endedAt;
      if (input.winner !== undefined) updates.winner = input.winner;
      if (input.notes !== undefined) updates.notes = input.notes;
      const { error } = await supabase.from("video_ab_tests" as any).update(updates as any).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ab-tests", workspaceId] }),
  });
}

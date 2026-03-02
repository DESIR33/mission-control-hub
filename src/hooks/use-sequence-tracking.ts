import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";

export interface SequenceStepEvent {
  id: string;
  workspace_id: string;
  enrollment_id: string;
  step_number: number;
  event_type: "scheduled" | "sent" | "delivered" | "opened" | "clicked" | "replied" | "bounced";
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export interface SequenceAnalytics {
  sequenceId: string;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
  stepMetrics: Array<{
    stepNumber: number;
    sent: number;
    opened: number;
    replied: number;
    openRate: number;
    replyRate: number;
  }>;
}

export function useSequenceTracking(sequenceId: string | null) {
  const { workspaceId } = useWorkspace();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["sequence-tracking", workspaceId, sequenceId],
    queryFn: async (): Promise<SequenceStepEvent[]> => {
      // First get enrollments for this sequence
      const { data: enrollments } = await supabase
        .from("sequence_enrollments" as any)
        .select("id")
        .eq("sequence_id", sequenceId!);

      if (!enrollments?.length) return [];

      const enrollmentIds = enrollments.map((e: any) => e.id);

      const { data, error } = await supabase
        .from("sequence_step_events" as any)
        .select("*")
        .in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId && !!sequenceId,
  });

  const analytics = useMemo((): SequenceAnalytics | null => {
    if (!sequenceId || !events.length) return null;

    const sent = events.filter((e) => e.event_type === "sent").length;
    const delivered = events.filter((e) => e.event_type === "delivered").length;
    const opened = events.filter((e) => e.event_type === "opened").length;
    const replied = events.filter((e) => e.event_type === "replied").length;
    const bounced = events.filter((e) => e.event_type === "bounced").length;

    // Per-step metrics
    const stepMap = new Map<number, { sent: number; opened: number; replied: number }>();
    for (const event of events) {
      const step = stepMap.get(event.step_number) ?? { sent: 0, opened: 0, replied: 0 };
      if (event.event_type === "sent") step.sent++;
      if (event.event_type === "opened") step.opened++;
      if (event.event_type === "replied") step.replied++;
      stepMap.set(event.step_number, step);
    }

    const stepMetrics = Array.from(stepMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([stepNumber, data]) => ({
        stepNumber,
        sent: data.sent,
        opened: data.opened,
        replied: data.replied,
        openRate: data.sent > 0 ? (data.opened / data.sent) * 100 : 0,
        replyRate: data.sent > 0 ? (data.replied / data.sent) * 100 : 0,
      }));

    return {
      sequenceId,
      totalSent: sent,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      replyRate: sent > 0 ? (replied / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      stepMetrics,
    };
  }, [events, sequenceId]);

  return { data: analytics, events, isLoading };
}

export function useLogSequenceEvent() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { enrollmentId: string; stepNumber: number; eventType: SequenceStepEvent["event_type"] }) => {
      const { error } = await supabase
        .from("sequence_step_events" as any)
        .insert({
          workspace_id: workspaceId,
          enrollment_id: input.enrollmentId,
          step_number: input.stepNumber,
          event_type: input.eventType,
          occurred_at: new Date().toISOString(),
          metadata: {},
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequence-tracking"] }),
  });
}

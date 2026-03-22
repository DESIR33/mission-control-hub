import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface SubscriberReferral {
  id: string;
  workspace_id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  reward_type: string;
  reward_value: number;
  reward_granted_at: string | null;
  status: string;
  created_at: string;
}

export interface ReferralLeaderboardEntry {
  referrer_id: string;
  referral_count: number;
  confirmed_count: number;
  total_rewards: number;
  referrer_email?: string;
  referrer_name?: string;
}

export function useSubscriberReferrals() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["subscriber-referrals", workspaceId],
    queryFn: async (): Promise<SubscriberReferral[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("subscriber_referrals" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubscriberReferral[];
    },
    enabled: !!workspaceId,
  });
}

export function useReferralLeaderboard() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["referral-leaderboard", workspaceId],
    queryFn: async (): Promise<ReferralLeaderboardEntry[]> => {
      if (!workspaceId) return [];

      const { data: referrals, error } = await supabase
        .from("subscriber_referrals" as any)
        .select("referrer_id, status, reward_value")
        .eq("workspace_id", workspaceId);
      if (error) throw error;

      const map = new Map<string, ReferralLeaderboardEntry>();
      for (const r of (referrals as any[]) ?? []) {
        const entry = map.get(r.referrer_id) ?? {
          referrer_id: r.referrer_id,
          referral_count: 0,
          confirmed_count: 0,
          total_rewards: 0,
        };
        entry.referral_count++;
        if (r.status === "confirmed" || r.status === "rewarded") {
          entry.confirmed_count++;
          entry.total_rewards += Number(r.reward_value) || 0;
        }
        map.set(r.referrer_id, entry);
      }

      // Fetch subscriber emails for leaderboard display
      const ids = [...map.keys()];
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from("subscribers" as any)
          .select("id, email, first_name, last_name")
          .in("id", ids);
        for (const s of (subs as any[]) ?? []) {
          const entry = map.get(s.id);
          if (entry) {
            entry.referrer_email = s.email;
            entry.referrer_name = [s.first_name, s.last_name].filter(Boolean).join(" ") || undefined;
          }
        }
      }

      return [...map.values()].sort((a, b) => b.confirmed_count - a.confirmed_count);
    },
    enabled: !!workspaceId,
  });
}

export function useGrantReferralReward() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reward_type, reward_value }: { id: string; reward_type: string; reward_value: number }) => {
      const { error } = await supabase
        .from("subscriber_referrals" as any)
        .update({ status: "rewarded", reward_type, reward_value, reward_granted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriber-referrals", workspaceId] });
      qc.invalidateQueries({ queryKey: ["referral-leaderboard", workspaceId] });
    },
  });
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeGetTime } from "@/lib/date-utils";

export interface EngagementDistribution {
  range: string;
  count: number;
  color: string;
}

export interface EngagementDashboardData {
  distribution: EngagementDistribution[];
  hotLeads: Array<{ id: string; name: string; score: number; company: string | null }>;
  atRisk: Array<{ id: string; name: string; score: number; lastContact: string | null }>;
  avgScore: number;
  totalScored: number;
}

export function useEngagementScores() {
  const { workspaceId } = useWorkspace();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["engagement-scores", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, engagement_score, last_contact_date, status, company_id, companies(name)")
        .eq("workspace_id", workspaceId!)
        .is("deleted_at", null)
        .order("engagement_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const dashboard = useMemo((): EngagementDashboardData | null => {
    if (!contacts.length) return null;

    const scored = contacts.filter((c: any) => c.engagement_score != null);

    // Distribution buckets
    const buckets = [
      { range: "0-20", min: 0, max: 20, color: "#ef4444", count: 0 },
      { range: "21-40", min: 21, max: 40, color: "#f97316", count: 0 },
      { range: "41-60", min: 41, max: 60, color: "#eab308", count: 0 },
      { range: "61-80", min: 61, max: 80, color: "#22c55e", count: 0 },
      { range: "81-100", min: 81, max: 100, color: "#3b82f6", count: 0 },
    ];

    for (const contact of scored) {
      const score = contact.engagement_score || 0;
      const bucket = buckets.find((b) => score >= b.min && score <= b.max);
      if (bucket) bucket.count++;
    }

    const distribution: EngagementDistribution[] = buckets.map((b) => ({
      range: b.range,
      count: b.count,
      color: b.color,
    }));

    // Hot leads — high score, active status
    const hotLeads = scored
      .filter((c: any) => (c.engagement_score || 0) >= 60)
      .slice(0, 10)
      .map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ""}`.trim(),
        score: c.engagement_score || 0,
        company: c.companies?.name || null,
      }));

    // At risk — low score or no recent contact
    const atRisk = scored
      .filter((c: any) => {
        const score = c.engagement_score || 0;
        if (score < 20) return true;
        if (!c.last_contact_date) return true;
        const daysSince = Math.floor((Date.now() - safeGetTime(c.last_contact_date)) / (1000 * 60 * 60 * 24));
        return daysSince > 30 && score < 50;
      })
      .slice(0, 10)
      .map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ""}`.trim(),
        score: c.engagement_score || 0,
        lastContact: c.last_contact_date,
      }));

    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((s: number, c: any) => s + (c.engagement_score || 0), 0) / scored.length)
      : 0;

    return {
      distribution,
      hotLeads,
      atRisk,
      avgScore,
      totalScored: scored.length,
    };
  }, [contacts]);

  return { data: dashboard, isLoading };
}

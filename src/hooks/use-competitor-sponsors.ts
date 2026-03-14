import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface CompetitorSponsor {
  id: string;
  workspace_id: string;
  sponsor_name: string;
  sponsor_url: string | null;
  detection_method: string;
  mention_count: number;
  competitor_channels: string[];
  first_detected_at: string;
  last_detected_at: string;
  company_id: string | null;
  deal_id: string | null;
  outreach_status: string;
  outreach_suggestion: string | null;
  dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompetitorSponsors() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["competitor-sponsors", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_sponsors" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("dismissed", false)
        .order("mention_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CompetitorSponsor[];
    },
    enabled: !!workspaceId,
  });
}

export function useScanCompetitorSponsors() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "scan-competitor-sponsors",
        { body: { workspace_id: workspaceId } },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Scan failed");
      return data as { success: boolean; scanned: number; sponsors_found: number; total_mentions: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitor-sponsors"] });
    },
  });
}

export function useUpdateSponsorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, outreach_status }: { id: string; outreach_status: string }) => {
      const { error } = await supabase
        .from("competitor_sponsors" as any)
        .update({ outreach_status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-sponsors"] }),
  });
}

export function useDismissSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("competitor_sponsors" as any)
        .update({ dismissed: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-sponsors"] }),
  });
}

export function useCreateDealFromSponsor() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sponsor: CompetitorSponsor) => {
      // First create company if not linked
      let companyId = sponsor.company_id;
      if (!companyId) {
        const { data: newCompany, error: compErr } = await supabase
          .from("companies")
          .insert({
            workspace_id: workspaceId,
            name: sponsor.sponsor_name,
            website: sponsor.sponsor_url,
          })
          .select("id")
          .single();
        if (compErr) throw compErr;
        companyId = newCompany.id;
      }

      // Create deal
      const { data: deal, error: dealErr } = await supabase
        .from("deals")
        .insert({
          workspace_id: workspaceId,
          title: `Sponsorship — ${sponsor.sponsor_name}`,
          company_id: companyId,
          stage: "prospecting",
          notes: sponsor.outreach_suggestion,
        })
        .select("id")
        .single();
      if (dealErr) throw dealErr;

      // Update sponsor record
      await supabase
        .from("competitor_sponsors" as any)
        .update({
          company_id: companyId,
          deal_id: deal.id,
          outreach_status: "in_pipeline",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sponsor.id);

      return deal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitor-sponsors"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

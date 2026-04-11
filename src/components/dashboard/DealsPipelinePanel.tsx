import { memo } from "react";
import { TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stageColors: Record<string, string> = {
  prospecting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  qualification: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  proposal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  negotiation: "bg-warning/20 text-warning border-warning/30",
};

const fmtMoney = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`);

export const DealsPipelinePanel = memo(function DealsPipelinePanel() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["pipeline-deals-panel", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, stage, expected_close_date, company_id")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .in("stage", ["prospecting", "qualification", "proposal", "negotiation"])
        .order("value", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  const totalValue = deals.reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="rounded-lg border border-border bg-card p-4 overflow-hidden min-w-0 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-green-500/10">
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground">Deals Pipeline</h3>
        <span className="ml-auto text-xs font-mono text-muted-foreground">{fmtMoney(totalValue)}</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />)}
        </div>
      ) : deals.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No active deals.</p>
      ) : (
        <div className="space-y-1 max-h-[320px] overflow-y-auto">
          {deals.map((deal) => (
            <button
              key={deal.id}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors hover:bg-secondary"
              onClick={() => navigate(`/deals?dealId=${deal.id}`)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-card-foreground truncate">{deal.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-3.5", stageColors[deal.stage] || "")}>
                    {deal.stage}
                  </Badge>
                  {deal.expected_close_date && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Close: {deal.expected_close_date}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-mono text-card-foreground shrink-0">
                {deal.value ? fmtMoney(deal.value) : "—"}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

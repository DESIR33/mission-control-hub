import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Award, DollarSign, Mail, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAgents } from "@/hooks/use-agents";

export function AgentImpactAttribution() {
  const { workspaceId } = useWorkspace();
  const { data: agents = [] } = useAgents();

  const { data: feedback = [] } = useQuery({
    queryKey: ["impact-feedback", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("agent_feedback")
        .select("agent_slug, action, created_at")
        .eq("workspace_id", workspaceId);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["impact-proposals", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("ai_proposals")
        .select("id, type, status, title, confidence, created_at")
        .eq("workspace_id", workspaceId)
        .in("status", ["approved", "executed"]);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const agentImpact = agents.map((agent) => {
    const agentFb = feedback.filter((f) => f.agent_slug === agent.slug);
    const accepted = agentFb.filter((f) => f.action === "accepted").length;
    const rejected = agentFb.filter((f) => f.action === "rejected").length;
    const total = accepted + rejected;
    const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      name: agent.name.length > 12 ? agent.name.slice(0, 12) + "…" : agent.name,
      slug: agent.slug,
      accepted,
      rejected,
      total,
      successRate,
    };
  }).filter((a) => a.total > 0);

  const totalAccepted = agentImpact.reduce((s, a) => s + a.accepted, 0);
  const totalProposals = proposals.length;
  const avgConfidence = proposals.length > 0
    ? Math.round(proposals.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / proposals.length * 100)
    : 0;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-5 w-5 text-primary" />
          Agent Impact Attribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{totalAccepted}</p>
            <p className="text-xs text-muted-foreground">Actions Taken</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{totalProposals}</p>
            <p className="text-xs text-muted-foreground">Approved Proposals</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{avgConfidence}%</p>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
          </div>
        </div>

        {agentImpact.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agentImpact} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(val: number, name: string) => [val, name === "accepted" ? "Accepted" : "Rejected"]}
              />
              <Bar dataKey="accepted" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rejected" stackId="a" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No feedback data yet. Accept or reject proposals to see impact.</p>
        )}
      </CardContent>
    </Card>
  );
}

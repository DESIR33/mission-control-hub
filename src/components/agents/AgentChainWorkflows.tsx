import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentWorkflows } from "@/hooks/use-agent-workflows";
import { GitBranch, Play, Plus, ArrowRight, Bot } from "lucide-react";
import { AGENT_COLORS } from "@/types/agents";

const AVAILABLE_AGENTS = [
  { slug: "competitor-analyst", name: "Competitor Analyst" },
  { slug: "content-strategist", name: "Content Strategist" },
  { slug: "growth-optimizer", name: "Growth Optimizer" },
  { slug: "audience-analyst", name: "Audience Analyst" },
  { slug: "revenue-optimizer", name: "Revenue Optimizer" },
];

export function AgentChainWorkflows() {
  const { data: workflows = [] } = useAgentWorkflows();

  const PRESET_CHAINS = [
    {
      name: "Trend → Script → Schedule",
      description: "Scan trends, draft script outline, suggest publish time",
      agents: ["competitor-analyst", "content-strategist", "growth-optimizer"],
    },
    {
      name: "Audience → Content → Revenue",
      description: "Analyze audience, create content strategy, optimize monetization",
      agents: ["audience-analyst", "content-strategist", "revenue-optimizer"],
    },
    {
      name: "Full Channel Audit",
      description: "Run all agents sequentially for a complete analysis",
      agents: ["competitor-analyst", "audience-analyst", "content-strategist", "growth-optimizer", "revenue-optimizer"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Agent Chain Workflows</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Chain agents together — output from one feeds into the next</p>
        </div>
      </div>

      {/* Preset chains */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preset Workflows</p>
        {PRESET_CHAINS.map((chain) => (
          <Card key={chain.name} className="border-border bg-card hover:bg-accent/5 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground">{chain.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{chain.description}</p>
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {chain.agents.map((slug, idx) => (
                      <div key={slug} className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[10px] ${AGENT_COLORS[slug] || "text-muted-foreground"}`}>
                          {AVAILABLE_AGENTS.find((a) => a.slug === slug)?.name || slug}
                        </Badge>
                        {idx < chain.agents.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                  <Play className="w-3.5 h-3.5" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom workflows from DB */}
      {workflows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Workflows</p>
          {workflows.map((w: any) => (
            <Card key={w.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{w.name}</h4>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  </div>
                  <Badge variant={w.enabled ? "default" : "secondary"} className="text-[10px]">
                    {w.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

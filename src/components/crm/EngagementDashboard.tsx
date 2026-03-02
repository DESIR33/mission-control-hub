import {
  Users, TrendingUp, AlertTriangle, Flame, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useEngagementScores } from "@/hooks/use-engagement-scores";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const scoreBadge = (score: number) => {
  if (score >= 80) return { label: "Hot", className: "bg-green-500/15 text-green-400 border-green-500/30" };
  if (score >= 60) return { label: "Warm", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (score >= 40) return { label: "Cool", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
  return { label: "Cold", className: "bg-red-500/15 text-red-400 border-red-500/30" };
};

export function EngagementDashboard() {
  const { data: dashboard, isLoading } = useEngagementScores();

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-72" />;
  }

  if (!dashboard) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No engagement data available. Run the scoring Edge Function first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Score</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{dashboard.avgScore}</p>
          <p className="text-[10px] text-muted-foreground">across {dashboard.totalScored} contacts</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hot Leads</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{dashboard.hotLeads.length}</p>
          <p className="text-[10px] text-muted-foreground">score 60+</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">At Risk</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{dashboard.atRisk.length}</p>
          <p className="text-[10px] text-muted-foreground">need attention</p>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Score Distribution</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dashboard.distribution}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Contacts" radius={[4, 4, 0, 0]}>
              {dashboard.distribution.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hot Leads & At Risk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-green-500" />
            Hot Leads
          </h3>
          <div className="space-y-2">
            {dashboard.hotLeads.slice(0, 5).map((lead) => {
              const badge = scoreBadge(lead.score);
              return (
                <div key={lead.id} className="flex items-center gap-2">
                  <span className="text-xs text-foreground flex-1 truncate">{lead.name}</span>
                  {lead.company && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{lead.company}</span>}
                  <Badge variant="outline" className={`text-[9px] ${badge.className}`}>
                    {lead.score}
                  </Badge>
                </div>
              );
            })}
            {dashboard.hotLeads.length === 0 && (
              <p className="text-xs text-muted-foreground">No hot leads yet</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            At Risk
          </h3>
          <div className="space-y-2">
            {dashboard.atRisk.slice(0, 5).map((contact) => {
              const badge = scoreBadge(contact.score);
              return (
                <div key={contact.id} className="flex items-center gap-2">
                  <span className="text-xs text-foreground flex-1 truncate">{contact.name}</span>
                  <Badge variant="outline" className={`text-[9px] ${badge.className}`}>
                    {contact.score}
                  </Badge>
                </div>
              );
            })}
            {dashboard.atRisk.length === 0 && (
              <p className="text-xs text-muted-foreground">No contacts at risk</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

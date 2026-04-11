import {
  Users, TrendingDown, AlertTriangle, Flame, BarChart3, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useEngagementScores } from "@/hooks/use-engagement-scores";
import { safeFormat } from "@/lib/date-utils";
import { chartTooltipStyle, cartesianGridDefaults, xAxisDefaults, yAxisDefaults } from "@/lib/chart-theme";

function getScoreBadge(score: number): { label: string; className: string } {
  if (score >= 80)
    return { label: "Hot", className: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (score >= 50)
    return { label: "Warm", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
  if (score >= 20)
    return { label: "Cool", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  return { label: "Cold", className: "bg-muted text-muted-foreground border-border" };
}

export function EngagementScorePanel() {
  const { data: dashboard, isLoading } = useEngagementScores();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Engagement Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dashboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Engagement Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No engagement data available yet.</p>
            <p className="text-xs mt-1">Score contacts to see engagement insights.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Identify contacts that may have had a significant score drop (needs attention)
  const needsAttention = dashboard.atRisk.filter((c) => c.score < 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Engagement Scoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Score + KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Avg Score
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {dashboard.avgScore}
            </p>
            <Progress value={dashboard.avgScore} className="h-1.5 mt-1" />
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Scored
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {dashboard.totalScored}
            </p>
            <p className="text-xs text-muted-foreground">contacts</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Hot Leads
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {dashboard.hotLeads.length}
            </p>
            <p className="text-xs text-muted-foreground">score 60+</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                At Risk
              </p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              {dashboard.atRisk.length}
            </p>
            <p className="text-xs text-muted-foreground">need attention</p>
          </div>
        </div>

        {/* Needs Attention Alert */}
        {needsAttention.length > 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Needs Attention
              </h3>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">
                {needsAttention.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              These contacts have very low engagement and may need immediate outreach.
            </p>
            <div className="space-y-1.5">
              {needsAttention.slice(0, 5).map((contact) => (
                <div key={contact.id} className="flex items-center gap-2">
                  <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">
                    {contact.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs bg-red-500/15 text-red-400 border-red-500/30"
                  >
                    {contact.score}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distribution Chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboard.distribution}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="range" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" name="Contacts" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800}>
                {dashboard.distribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hot Leads & At-Risk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Hot Leads */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              Hot Leads
            </h3>
            <div className="space-y-2">
              {dashboard.hotLeads.length === 0 && (
                <p className="text-xs text-muted-foreground">No hot leads yet</p>
              )}
              {dashboard.hotLeads.slice(0, 8).map((lead) => {
                const badge = getScoreBadge(lead.score);
                return (
                  <div key={lead.id} className="flex items-center gap-2">
                    <span className="text-xs text-foreground flex-1 truncate">
                      {lead.name}
                    </span>
                    {lead.company && (
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {lead.company}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${badge.className}`}
                    >
                      {badge.label} {lead.score}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* At-Risk Contacts */}
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              At-Risk Contacts
            </h3>
            <div className="space-y-2">
              {dashboard.atRisk.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No contacts at risk
                </p>
              )}
              {dashboard.atRisk.slice(0, 8).map((contact) => {
                const badge = getScoreBadge(contact.score);
                return (
                  <div key={contact.id} className="flex items-center gap-2">
                    <span className="text-xs text-foreground flex-1 truncate">
                      {contact.name}
                    </span>
                    {contact.lastContact && (
                      <span className="text-xs text-muted-foreground">
                        Last:{" "}
                        {safeFormat(contact.lastContact, "P")}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${badge.className}`}
                    >
                      {badge.label} {contact.score}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

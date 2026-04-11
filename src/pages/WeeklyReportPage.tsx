import { useState } from "react";
import {
  FileText,
  TrendingUp,
  Users,
  Play,
  DollarSign,
  Target,
  RefreshCw,
  Calendar,
  BarChart3,
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  useWeeklyReports,
  useGenerateWeeklyReport,
  type WeeklyReport,
} from "@/hooks/use-weekly-reports";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { WeeklyRevenueSection } from "@/components/weekly-report/WeeklyRevenueSection";
import { safeFormat } from "@/lib/date-utils";
import { useGrowthAlerts, type GrowthAlert } from "@/hooks/use-growth-alerts";

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function ReportCard({
  report,
  isExpanded,
  onToggle,
}: {
  report: WeeklyReport;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const d = report.report_data;
  const subscriberChange = d.subscriber_change ?? 0;
  const changeSign = subscriberChange >= 0 ? "+" : "";

  return (
    <div
      className="rounded-lg border border-border bg-card transition-colors hover:border-primary/50 cursor-pointer"
      onClick={onToggle}
    >
      {/* Summary row */}
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            Week of {safeFormat(report.report_date, "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span
              className={`text-xs font-mono font-semibold ${
                subscriberChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {changeSign}{subscriberChange.toLocaleString()}
            </span>
          </div>
          {d.revenue_earned != null && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono font-semibold text-foreground">
                {fmtCurrency(d.revenue_earned)}
              </span>
            </div>
          )}
          {d.videos_published != null && (
            <div className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-foreground">
                {d.videos_published}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-5">
          {/* Subscriber Growth */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Subscriber Growth
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Subscribers
                </p>
                <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {d.subscriber_count != null
                    ? d.subscriber_count.toLocaleString()
                    : "--"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Change
                </p>
                <p
                  className={`text-lg font-bold font-mono mt-0.5 ${
                    subscriberChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {changeSign}{subscriberChange.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Video Performance */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Video Performance
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Videos Published
                </p>
                <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {d.videos_published ?? "--"}
                </p>
              </div>
              {d.top_video && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Top Video
                  </p>
                  <p
                    className="text-sm font-medium text-foreground mt-0.5 truncate"
                    title={d.top_video.title}
                  >
                    {d.top_video.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {d.top_video.views.toLocaleString()} views
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Deals & Revenue */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Deals
                </h3>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Deals Closed
                </p>
                <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {d.deals_closed ?? "--"}
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-500" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Revenue
                </h3>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Revenue Earned
                </p>
                <p className="text-lg font-bold text-foreground font-mono mt-0.5">
                  {d.revenue_earned != null ? fmtCurrency(d.revenue_earned) : "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline Health */}
          {d.pipeline_status && Object.keys(d.pipeline_status).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Pipeline Health
                </h3>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                {(() => {
                  const entries = Object.entries(d.pipeline_status!);
                  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
                  return entries.map(([stage, count]) => (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 truncate capitalize">
                        {stage.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(count / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Goal Progress */}
          {d.goal_progress != null && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Goal Progress
                </h3>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {d.goal_progress.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(d.goal_progress, 100)}
                  className="h-2.5"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GrowthMilestonesSection() {
  const { alerts } = useGrowthAlerts();
  const milestones = alerts.filter((a) => a.severity === "celebration" || a.alertType === "milestone_reached");
  if (milestones.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Growth Milestones</h2>
      </div>
      <div className="space-y-2">
        {milestones.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center gap-3 rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2"
          >
            <span className="text-green-500 text-sm">&#x1F389;</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.message}</p>
              <p className="text-xs text-muted-foreground">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyReportPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isLoading: workspaceLoading } = useWorkspace();
  const { data: reports = [], isLoading: reportsLoading } = useWeeklyReports();
  const generateReport = useGenerateWeeklyReport();

  const isLoading = workspaceLoading || reportsLoading;

  const handleGenerate = () => {
    generateReport.mutate(undefined, {
      onSuccess: () => toast.success("Weekly report generated successfully!"),
      onError: (err: Error) => toast.error(`Failed to generate report: ${err.message}`),
    });
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Weekly Reports</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generateReport.isPending}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${generateReport.isPending ? "animate-spin" : ""}`}
          />
          Generate Report
        </Button>
      </div>

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            No weekly reports yet
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Generate Report" to create your first weekly performance snapshot.
          </p>
        </div>
      )}

      {/* Weekly Revenue Section */}
      <WeeklyRevenueSection />

      {/* Growth Milestones */}
      <GrowthMilestonesSection />

      {/* Report cards */}
      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isExpanded={expandedId === report.id}
              onToggle={() => handleToggle(report.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useMemo } from "react";
import { ArrowLeft, TrendingUp, Lightbulb, AlertCircle, DollarSign, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { fmtCount, fmtMoney, fmtDuration, chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, lineDefaults } from "@/lib/chart-theme";
import { useVideoDetail, useVideoAnalyticsTrend } from "@/hooks/use-video-detail";
import { useVideoNotes } from "@/hooks/use-video-notes";
import { useVideoExperiments } from "@/hooks/use-video-experiments";
import { useRunVideoOptimizer } from "@/hooks/use-agents";
import { useVideoRepurposes } from "@/hooks/use-video-repurposes";
import { useVideoDeals } from "@/hooks/use-video-deals";
import { useDemographics, useTrafficSources } from "@/hooks/use-youtube-analytics-api";
import { useVideoRetention } from "@/hooks/use-video-retention";
import { useVideoRevenueLookup } from "@/hooks/use-video-revenue-lookup";
import { VideoHeaderCard } from "@/components/video-detail/VideoHeaderCard";
import { NotesEditor } from "@/components/video-detail/NotesEditor";
import { ExperimentsTable } from "@/components/video-detail/ExperimentsTable";
import { RepurposingTable } from "@/components/video-detail/RepurposingTable";
import { RepurposingWorkflow } from "@/components/video-detail/RepurposingWorkflow";
import { DealsAttributionPanel } from "@/components/video-detail/DealsAttributionPanel";
import { RetentionCurve } from "@/components/video-detail/RetentionCurve";
import { VideoCompaniesPanel } from "@/components/video-detail/VideoCompaniesPanel";
import { VideoOptimizationHub } from "@/components/video-detail/VideoOptimizationHub";
import { SponsorSegmentTracker } from "@/components/video-detail/SponsorSegmentTracker";
import { SubtitleUploader } from "@/components/video-detail/SubtitleUploader";

export default function VideoDetailPage() {
  const { youtubeVideoId } = useParams<{ youtubeVideoId: string }>();
  const navigate = useNavigate();

  const { data: detail, isLoading: loadingDetail } = useVideoDetail(youtubeVideoId);
  const { data: trend = [] } = useVideoAnalyticsTrend(youtubeVideoId);
  const { note, isLoading: loadingNotes, upsert } = useVideoNotes(youtubeVideoId);
  const { experiments, isLoading: loadingExp, create: createExp, update: updateExp, remove: removeExp } = useVideoExperiments(youtubeVideoId);
  const { repurposes, isLoading: loadingRep, create: createRep, update: updateRep, remove: removeRep } = useVideoRepurposes(youtubeVideoId);
  const { data: deals = [], isLoading: loadingDeals } = useVideoDeals(youtubeVideoId);
  const { data: demographics = [] } = useDemographics();
  const { data: trafficSources = [] } = useTrafficSources();
  const { data: retentionData = [] } = useVideoRetention(youtubeVideoId);
  const { lookup: revenueLookup } = useVideoRevenueLookup();
  const runOptimizer = useRunVideoOptimizer();

  // Get combined revenue data for this video
  const videoRevenue = youtubeVideoId ? revenueLookup.get(youtubeVideoId) : undefined;

  const handleSaveNotes = useCallback((updates: any) => {
    upsert.mutate(updates);
  }, [upsert]);

  // Insights heuristics
  const insights = useMemo(() => {
    if (!detail) return [];
    const tips: string[] = [];
    if (detail.ctr_percent > 0 && detail.ctr_percent < 4) tips.push("CTR is below 4%. Consider testing a new thumbnail or title.");
    if (detail.ctr_percent >= 8) tips.push("Great CTR! This thumbnail/title combo is working well — replicate this style.");
    if (detail.views > 0 && detail.likes / detail.views < 0.02) tips.push("Like ratio is low. Consider stronger CTAs for engagement.");
    if (detail.average_view_duration_seconds > 0 && detail.average_view_duration_seconds < 120) tips.push("Average view duration is short. Hook viewers in the first 30 seconds.");
    if (detail.subscribers_gained > 50) tips.push("Strong subscriber conversion — consider making similar content.");
    if (detail.estimated_revenue > 0 && detail.views > 0) {
      const rpm = (detail.estimated_revenue / detail.views) * 1000;
      if (rpm > 10) tips.push(`RPM is $${rpm.toFixed(2)} — above average. This topic has strong ad value.`);
    }
    if (tips.length === 0) tips.push("Sync more data to unlock actionable insights.");
    return tips;
  }, [detail]);

  const trendChart = useMemo(() => {
    return trend.map((d: any) => ({
      date: format(new Date(d.date), "MMM d"),
      views: d.views,
      ctr: d.impressions_ctr,
      revenue: d.estimated_revenue ?? 0,
    }));
  }, [trend]);

  // Cumulative revenue from trend data
  const cumulativeAdRevenue = useMemo(() => {
    return trend.reduce((s: number, d: any) => s + (Number(d.estimated_revenue) || 0), 0);
  }, [trend]);

  if (loadingDetail) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/youtube/channel-videos?tab=videos")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Channel & Videos
        </Button>
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">Video Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No data for video <code className="bg-muted px-1 py-0.5 rounded text-xs">{youtubeVideoId}</code>. Sync your YouTube data first.
          </p>
        </div>
      </div>
    );
  }

  const totalCombinedRevenue = (videoRevenue?.totalRevenue ?? 0) || detail.estimated_revenue;
  const rpm = detail.views > 0 ? (totalCombinedRevenue / detail.views) * 1000 : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/youtube/channel-videos?tab=videos")} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Channel & Videos
        </Button>
        <Button
          size="sm"
          onClick={() => runOptimizer.mutate({ max_videos: 1 })}
          disabled={runOptimizer.isPending}
          className="gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          {runOptimizer.isPending ? "Optimizing…" : "Optimize Video"}
        </Button>
      </div>

      <VideoHeaderCard
        title={detail.title}
        youtubeVideoId={detail.youtube_video_id}
        publishedAt={detail.published_at}
        views={detail.views}
        watchTimeMinutes={detail.watch_time_minutes}
        avgViewDurationSeconds={detail.average_view_duration_seconds}
        ctrPercent={detail.ctr_percent}
        impressions={detail.impressions}
        likes={detail.likes}
        comments={detail.comments}
        subsGained={detail.subscribers_gained}
        hasAnalyticsData={detail.hasAnalyticsData}
        totalRevenue={totalCombinedRevenue}
        rpm={rpm}
      />

      <VideoCompaniesPanel youtubeVideoId={detail.youtube_video_id} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 border-b border-border rounded-none pb-2">
          {["Overview", "Performance", "Audience", "Traffic", "Revenue", "AI Suggestions", "Optimization Tracker", "Notes", "Experiments", "Repurposing"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md px-3 py-1.5"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-5 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Engagement Rate" value={detail.views > 0 ? `${(((detail.likes + detail.comments) / detail.views) * 100).toFixed(2)}%` : "—"} />
            <SummaryCard label="Like Ratio" value={detail.views > 0 ? `${((detail.likes / detail.views) * 100).toFixed(2)}%` : "—"} />
            <SummaryCard label="Sub Conversion" value={detail.views > 0 && detail.subscribers_gained > 0 ? `${((detail.subscribers_gained / detail.views) * 100).toFixed(3)}%` : "—"} />
            <SummaryCard label="Shares" value={detail.shares > 0 ? fmtCount(detail.shares) : "—"} />
          </div>

          {/* Trend chart */}
          {trendChart.length > 1 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Views Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendChart} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid {...cartesianGridDefaults} />
                  <XAxis dataKey="date" {...xAxisDefaults} />
                  <YAxis {...yAxisDefaults} tickFormatter={fmtCount} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" {...lineDefaults} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No trend data yet. Sync Analytics API for daily breakdowns.
            </div>
          )}

          {/* Insights */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" /> What To Do Next
            </h3>
            <ul className="space-y-1.5">
              {insights.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Avg View Duration" value={detail.average_view_duration_seconds > 0 ? fmtDuration(detail.average_view_duration_seconds) : "—"} />
            <SummaryCard label="Avg View %" value={detail.average_view_percentage > 0 ? `${detail.average_view_percentage.toFixed(1)}%` : "—"} />
            <SummaryCard label="Card Clicks" value={fmtCount(detail.card_clicks)} />
            <SummaryCard label="End Screen Clicks" value={fmtCount(detail.end_screen_element_clicks)} />
          </div>
          {/* Retention Curve */}
          <RetentionCurve
            data={retentionData}
            avgViewPercentage={detail.average_view_percentage}
            videoDurationSeconds={detail.average_view_duration_seconds > 0
              ? Math.round(detail.average_view_duration_seconds / (detail.average_view_percentage / 100 || 1))
              : 0
            }
          />

          {/* Benchmarks vs channel median placeholder */}
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Top moments and publish-time analysis will appear here when more data is available.
          </div>
        </TabsContent>

        {/* Audience */}
        <TabsContent value="audience" className="space-y-5 mt-4">
          {demographics.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Demographics (Channel-Level)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demographics.map((d: any) => (
                  <div key={d.id} className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
                    <p className="text-xs uppercase text-muted-foreground">{d.gender} · {d.age_group}</p>
                    <p className="text-sm font-mono font-bold text-foreground">{d.viewer_percentage.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No demographics data. Sync Analytics API to see audience breakdown.
            </div>
          )}
          <SummaryCard label="Subscriber Conversion" value={detail.views > 0 && detail.subscribers_gained > 0 ? `${((detail.subscribers_gained / detail.views) * 100).toFixed(3)}%` : "—"} />
        </TabsContent>

        {/* Traffic */}
        <TabsContent value="traffic" className="space-y-5 mt-4">
          {trafficSources.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Traffic Sources (Channel-Level)</h3>
              <div className="space-y-2">
                {trafficSources.map((ts: any) => (
                  <div key={ts.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-foreground capitalize">{ts.source_type.replace(/_/g, " ")}</span>
                    <span className="text-sm font-mono text-muted-foreground">{fmtCount(ts.views)} views</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No traffic source data. Sync Analytics API to see traffic breakdown.
            </div>
          )}
        </TabsContent>

        {/* Revenue — Enhanced with combined revenue (Feature 1 + 7 + 10) */}
        <TabsContent value="revenue" className="space-y-5 mt-4">
          {/* Total Combined Revenue */}
          {totalCombinedRevenue > 0 && (
            <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-semibold text-foreground">Total Combined Revenue</h3>
              </div>
              <p className="text-2xl font-bold font-mono text-green-500">{fmtMoney(totalCombinedRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ad + Sponsorship + Affiliate revenue combined</p>
            </div>
          )}

          {/* Revenue breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Ad Revenue" value={videoRevenue?.adRevenue ? fmtMoney(videoRevenue.adRevenue) : (detail.estimated_revenue > 0 ? fmtMoney(detail.estimated_revenue) : "—")} />
            <SummaryCard label="Deal Revenue" value={videoRevenue?.dealRevenue ? fmtMoney(videoRevenue.dealRevenue) : "—"} />
            <SummaryCard label="Affiliate Revenue" value={videoRevenue?.affiliateRevenue ? fmtMoney(videoRevenue.affiliateRevenue) : "—"} />
            <SummaryCard label="Total Revenue" value={totalCombinedRevenue > 0 ? fmtMoney(totalCombinedRevenue) : "—"} />
            <SummaryCard label="RPM" value={rpm > 0 ? fmtMoney(rpm) : "—"} />
            <SummaryCard label="Revenue/View" value={videoRevenue?.revenuePerView ? `$${videoRevenue.revenuePerView.toFixed(4)}` : (detail.views > 0 && detail.estimated_revenue > 0 ? `$${(detail.estimated_revenue / detail.views).toFixed(4)}` : "—")} />
          </div>

          {/* Cumulative Ad Revenue */}
          {cumulativeAdRevenue > 0 && (
            <SummaryCard label="Cumulative Ad Revenue (Trend Period)" value={fmtMoney(cumulativeAdRevenue)} />
          )}

          {/* Revenue Trend Chart (Feature 7) */}
          {trendChart.some((d) => d.revenue > 0) && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Daily Ad Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendChart} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid {...cartesianGridDefaults} />
                  <XAxis dataKey="date" {...xAxisDefaults} />
                  <YAxis {...yAxisDefaults} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" {...lineDefaults} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <DealsAttributionPanel deals={deals} isLoading={loadingDeals} />
          
          {/* Sponsor Segment Attribution */}
          {youtubeVideoId && <SponsorSegmentTracker videoId={youtubeVideoId} />}
          
          {/* Subtitles */}
          {youtubeVideoId && <SubtitleUploader youtubeVideoId={youtubeVideoId} videoTitle={detail?.title || ""} />}
        </TabsContent>

        {/* AI Suggestions */}
        <TabsContent value="ai suggestions" className="mt-4">
          <VideoOptimizationPanel youtubeVideoId={youtubeVideoId} />
        </TabsContent>

        {/* Optimization Tracker */}
        <TabsContent value="optimization tracker" className="mt-4">
          <VideoOptimizationTracker youtubeVideoId={youtubeVideoId} />
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <NotesEditor
            note={note}
            isLoading={loadingNotes}
            onSave={handleSaveNotes}
            isSaving={upsert.isPending}
          />
        </TabsContent>

        {/* Experiments */}
        <TabsContent value="experiments" className="mt-4">
          <ExperimentsTable
            experiments={experiments}
            onCreate={(exp) => createExp.mutate(exp)}
            onUpdate={(exp) => updateExp.mutate(exp)}
            onRemove={(id) => removeExp.mutate(id)}
            isCreating={createExp.isPending}
          />
        </TabsContent>

        {/* Repurposing */}
        <TabsContent value="repurposing" className="mt-4">
          <RepurposingWorkflow youtubeVideoId={youtubeVideoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-card/80">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className="text-lg font-bold font-mono text-foreground mt-0.5">{value}</p>
    </div>
  );
}


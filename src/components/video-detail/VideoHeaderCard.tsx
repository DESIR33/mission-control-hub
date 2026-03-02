import { Eye, Clock, ThumbsUp, MessageSquare, Users, MousePointerClick, Share2, DollarSign } from "lucide-react";

interface Props {
  title: string;
  youtubeVideoId: string;
  publishedAt: string | null;
  views: number;
  watchTimeMinutes: number;
  avgViewDurationSeconds: number;
  ctrPercent: number;
  impressions: number;
  likes: number;
  comments: number;
  subsGained: number;
  hasAnalyticsData: boolean;
  totalRevenue?: number;
  rpm?: number;
}

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtDuration = (seconds: number) => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
};

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export function VideoHeaderCard({
  title, youtubeVideoId, publishedAt, views, watchTimeMinutes,
  avgViewDurationSeconds, ctrPercent, impressions, likes, comments,
  subsGained, hasAnalyticsData, totalRevenue, rpm,
}: Props) {
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex gap-4 flex-col sm:flex-row">
        <a
          href={`https://youtube.com/watch?v=${youtubeVideoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full sm:w-64 rounded-md object-cover aspect-video"
          />
        </a>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
          {publishedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Published {new Date(publishedAt).toLocaleDateString()}
            </p>
          )}
          {!hasAnalyticsData && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Showing Data API stats. Sync Analytics for richer metrics.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <KpiChip icon={<Eye className="w-3 h-3" />} label="Views" value={fmtCount(views)} />
        <KpiChip icon={<Clock className="w-3 h-3" />} label="Watch Time" value={watchTimeMinutes >= 60 ? `${Math.round(watchTimeMinutes / 60)}h` : `${watchTimeMinutes}m`} />
        <KpiChip icon={<Clock className="w-3 h-3" />} label="Avg Duration" value={avgViewDurationSeconds > 0 ? fmtDuration(avgViewDurationSeconds) : "—"} />
        <KpiChip icon={<MousePointerClick className="w-3 h-3" />} label="CTR" value={ctrPercent > 0 ? `${ctrPercent.toFixed(1)}%` : "—"} />
        <KpiChip icon={<Eye className="w-3 h-3" />} label="Impressions" value={impressions > 0 ? fmtCount(impressions) : "—"} />
        <KpiChip icon={<ThumbsUp className="w-3 h-3" />} label="Likes" value={fmtCount(likes)} />
        <KpiChip icon={<MessageSquare className="w-3 h-3" />} label="Comments" value={fmtCount(comments)} />
        <KpiChip icon={<Users className="w-3 h-3" />} label="Subs Gained" value={subsGained > 0 ? `+${fmtCount(subsGained)}` : "—"} />
        <KpiChip icon={<DollarSign className="w-3 h-3" />} label="Total Revenue" value={totalRevenue && totalRevenue > 0 ? fmtMoney(totalRevenue) : "—"} />
        <KpiChip icon={<DollarSign className="w-3 h-3" />} label="RPM" value={rpm && rpm > 0 ? fmtMoney(rpm) : "—"} />
      </div>
    </div>
  );
}

function KpiChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold font-mono text-foreground">{value}</p>
    </div>
  );
}

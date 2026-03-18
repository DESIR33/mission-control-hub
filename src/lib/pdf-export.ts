/**
 * PDF Export utility for YouTube Analytics reports.
 * Generates beautifully styled HTML and opens it in a new window for print-to-PDF.
 */
import { format } from "date-fns";
import type { ChannelAnalytics, VideoAnalytics } from "@/hooks/use-youtube-analytics-api";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const fmtCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtMoney = (n: number): string => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const fmtDuration = (seconds: number): string => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds)}s`;
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #6366f1; }
  .header h1 { font-size: 28px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
  .header .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
  .header .date { font-size: 12px; color: #94a3b8; text-align: right; }
  .badge { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title::before { content: ''; display: block; width: 4px; height: 18px; background: #6366f1; border-radius: 4px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi-value { font-size: 22px; font-weight: 800; color: #1a1a2e; }
  .kpi-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .kpi-positive { color: #22c55e; }
  .kpi-negative { color: #ef4444; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
  thead th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
  thead th:first-child { border-radius: 8px 0 0 0; }
  thead th:last-child { border-radius: 0 8px 0 0; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  tbody tr:hover { background: #f8fafc; }
  tbody tr:last-child td { border-bottom: none; }
  .mono { font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 12px; }
  .text-right { text-align: right; }
  .text-green { color: #22c55e; }
  .text-muted { color: #94a3b8; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .rank { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; font-size: 11px; font-weight: 700; }
  .rank-1 { background: #fef3c7; color: #d97706; }
  .rank-2 { background: #f1f5f9; color: #475569; }
  .rank-3 { background: #fef2f2; color: #b45309; }
  .rank-default { background: #f8fafc; color: #94a3b8; }
  .truncate { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chart-bar-container { margin-bottom: 24px; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .bar-label { width: 200px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
  .bar-track { flex: 1; height: 20px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 6px; background: linear-gradient(90deg, #6366f1, #8b5cf6); }
  .bar-value { font-size: 12px; font-weight: 600; color: #475569; width: 60px; text-align: right; flex-shrink: 0; }
  @media print {
    body { padding: 20px; }
    .kpi-card { break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
`;

function renderKpi(label: string, value: string, sub?: string, className?: string) {
  return `<div class="kpi-card">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value ${className || ''}">${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
  </div>`;
}

function openPrintWindow(title: string, bodyHtml: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${CSS}</style>
</head>
<body>
  ${bodyHtml}
  <div class="footer">Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")} · YouTube Analytics Report</div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ── Channel Report ────────────────────────────────────────────────────

export function exportChannelReport(data: ChannelAnalytics[], daysRange: number) {
  if (data.length === 0) return;

  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totals = sorted.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      watchTime: acc.watchTime + d.estimated_minutes_watched,
      subsGained: acc.subsGained + d.subscribers_gained,
      subsLost: acc.subsLost + d.subscribers_lost,
      netSubs: acc.netSubs + d.net_subscribers,
      likes: acc.likes + d.likes,
      comments: acc.comments + d.comments,
      shares: acc.shares + d.shares,
      impressions: acc.impressions + d.impressions,
      revenue: acc.revenue + d.estimated_revenue,
      cardClicks: acc.cardClicks + d.card_clicks,
      endScreenClicks: acc.endScreenClicks + d.end_screen_element_clicks,
    }),
    { views: 0, watchTime: 0, subsGained: 0, subsLost: 0, netSubs: 0, likes: 0, comments: 0, shares: 0, impressions: 0, revenue: 0, cardClicks: 0, endScreenClicks: 0 }
  );

  const withViews = sorted.filter((d) => d.views > 0);
  const avgCtr = withViews.length > 0
    ? (withViews.reduce((s, d) => s + d.impressions_ctr * d.views, 0) / withViews.reduce((s, d) => s + d.views, 0)).toFixed(2)
    : "0";
  const avgDuration = withViews.length > 0
    ? Math.round(withViews.reduce((s, d) => s + d.average_view_duration_seconds * d.views, 0) / withViews.reduce((s, d) => s + d.views, 0))
    : 0;

  const dateRange = sorted.length > 0
    ? `${format(new Date(sorted[0].date), "MMM d, yyyy")} – ${format(new Date(sorted[sorted.length - 1].date), "MMM d, yyyy")}`
    : "";

  const html = `
    <div class="header">
      <div>
        <h1>Channel Analytics Report</h1>
        <div class="subtitle">${dateRange} · ${daysRange}-day overview</div>
      </div>
      <div class="date">
        <span class="badge">Channel Report</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Key Performance Indicators</div>
      <div class="kpi-grid">
        ${renderKpi("Total Views", fmtCount(totals.views), `${daysRange}-day total`)}
        ${renderKpi("Watch Time", totals.watchTime >= 60 ? `${Math.round(totals.watchTime / 60)}h` : `${totals.watchTime}m`, "estimated")}
        ${renderKpi("Net Subscribers", `${totals.netSubs >= 0 ? "+" : ""}${fmtCount(totals.netSubs)}`, `+${fmtCount(totals.subsGained)} / -${fmtCount(totals.subsLost)}`, totals.netSubs >= 0 ? 'kpi-positive' : 'kpi-negative')}
        ${renderKpi("Impressions", fmtCount(totals.impressions), `${avgCtr}% avg CTR`)}
        ${renderKpi("Avg View Duration", fmtDuration(avgDuration), "per view")}
        ${renderKpi("Engagement", fmtCount(totals.likes + totals.comments + totals.shares), `${fmtCount(totals.likes)} likes · ${fmtCount(totals.shares)} shares`)}
        ${totals.revenue > 0 ? renderKpi("Estimated Revenue", fmtMoney(totals.revenue), "total", 'kpi-positive') : ''}
        ${renderKpi("Card Clicks", fmtCount(totals.cardClicks))}
        ${renderKpi("End Screen Clicks", fmtCount(totals.endScreenClicks))}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Daily Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="text-right">Views</th>
            <th class="text-right">Watch Time</th>
            <th class="text-right">Net Subs</th>
            <th class="text-right">Impressions</th>
            <th class="text-right">CTR</th>
            <th class="text-right">Likes</th>
            <th class="text-right">Comments</th>
            ${totals.revenue > 0 ? '<th class="text-right">Revenue</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${sorted.map((d) => `
            <tr>
              <td>${format(new Date(d.date), "MMM d, yyyy")}</td>
              <td class="text-right mono">${d.views.toLocaleString()}</td>
              <td class="text-right mono">${Math.round(d.estimated_minutes_watched)}m</td>
              <td class="text-right mono ${d.net_subscribers >= 0 ? 'kpi-positive' : 'kpi-negative'}">${d.net_subscribers >= 0 ? '+' : ''}${d.net_subscribers}</td>
              <td class="text-right mono">${d.impressions.toLocaleString()}</td>
              <td class="text-right mono">${d.impressions_ctr.toFixed(2)}%</td>
              <td class="text-right mono">${d.likes.toLocaleString()}</td>
              <td class="text-right mono">${d.comments.toLocaleString()}</td>
              ${totals.revenue > 0 ? `<td class="text-right mono text-green">${fmtMoney(d.estimated_revenue)}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  openPrintWindow("Channel Analytics Report", html);
}

// ── Video Report ──────────────────────────────────────────────────────

export function exportVideoReport(data: VideoAnalytics[], publishedAtMap?: Map<string, string>) {
  if (data.length === 0) return;

  // Aggregate by video
  const grouped = new Map<string, VideoAnalytics[]>();
  for (const row of data) {
    const existing = grouped.get(row.youtube_video_id);
    if (existing) existing.push(row);
    else grouped.set(row.youtube_video_id, [row]);
  }

  const videos = Array.from(grouped.entries()).map(([videoId, rows]) => {
    const latest = rows.reduce((a, b) => (a.date >= b.date ? a : b));
    const views = rows.reduce((s, r) => s + r.views, 0);
    const likes = rows.reduce((s, r) => s + r.likes, 0);
    const comments = rows.reduce((s, r) => s + r.comments, 0);
    const shares = rows.reduce((s, r) => s + r.shares, 0);
    const watchTime = rows.reduce((s, r) => s + r.estimated_minutes_watched, 0);
    const subsGained = rows.reduce((s, r) => s + r.subscribers_gained, 0);
    const subsLost = rows.reduce((s, r) => s + r.subscribers_lost, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const revenue = rows.reduce((s, r) => s + r.estimated_revenue, 0);
    const avgDuration = views > 0
      ? rows.reduce((s, r) => s + r.average_view_duration_seconds * r.views, 0) / views
      : 0;
    const ctr = impressions > 0
      ? rows.reduce((s, r) => s + r.impressions_ctr * r.impressions, 0) / impressions
      : 0;
    const engagementRate = views > 0 ? ((likes + comments + shares) / views * 100) : 0;
    const publishedAt = publishedAtMap?.get(videoId);

    return {
      videoId, title: latest.title || "Untitled Video",
      views, likes, comments, shares, watchTime,
      subsGained, subsLost, impressions, revenue,
      avgDuration, ctr, engagementRate, publishedAt,
    };
  }).sort((a, b) => b.views - a.views);

  const totals = videos.reduce(
    (acc, v) => ({
      views: acc.views + v.views,
      watchTime: acc.watchTime + v.watchTime,
      likes: acc.likes + v.likes,
      comments: acc.comments + v.comments,
      shares: acc.shares + v.shares,
      impressions: acc.impressions + v.impressions,
      revenue: acc.revenue + v.revenue,
      subsGained: acc.subsGained + v.subsGained,
    }),
    { views: 0, watchTime: 0, likes: 0, comments: 0, shares: 0, impressions: 0, revenue: 0, subsGained: 0 }
  );

  const maxViews = Math.max(...videos.map((v) => v.views), 1);

  const html = `
    <div class="header">
      <div>
        <h1>Video Performance Report</h1>
        <div class="subtitle">${videos.length} videos analyzed</div>
      </div>
      <div class="date">
        <span class="badge">Video Report</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Aggregate Performance</div>
      <div class="kpi-grid">
        ${renderKpi("Total Views", fmtCount(totals.views))}
        ${renderKpi("Watch Time", totals.watchTime >= 60 ? `${Math.round(totals.watchTime / 60)}h` : `${totals.watchTime}m`)}
        ${renderKpi("Likes", fmtCount(totals.likes))}
        ${renderKpi("Comments", fmtCount(totals.comments))}
        ${renderKpi("Shares", fmtCount(totals.shares))}
        ${renderKpi("Total Impressions", fmtCount(totals.impressions))}
        ${renderKpi("Net Subscribers", `+${fmtCount(totals.subsGained)}`, '', 'kpi-positive')}
        ${totals.revenue > 0 ? renderKpi("Est. Revenue", fmtMoney(totals.revenue), '', 'kpi-positive') : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Top Videos by Views</div>
      <div class="chart-bar-container">
        ${videos.slice(0, 10).map((v) => `
          <div class="bar-row">
            <div class="bar-label">${v.title}</div>
            <div class="bar-track"><div class="bar-fill" style="width: ${(v.views / maxViews * 100).toFixed(1)}%"></div></div>
            <div class="bar-value">${fmtCount(v.views)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">All Videos – Detailed Metrics</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th class="text-right">Views</th>
            <th class="text-right">CTR</th>
            <th class="text-right">Avg Duration</th>
            <th class="text-right">Engagement</th>
            <th class="text-right">Net Subs</th>
            ${totals.revenue > 0 ? '<th class="text-right">Revenue</th>' : ''}
            <th class="text-right">Published</th>
          </tr>
        </thead>
        <tbody>
          ${videos.map((v, i) => `
            <tr>
              <td><span class="rank ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-default'}">${i + 1}</span></td>
              <td class="truncate">${v.title}</td>
              <td class="text-right mono">${v.views.toLocaleString()}</td>
              <td class="text-right mono">${v.ctr.toFixed(2)}%</td>
              <td class="text-right mono">${fmtDuration(v.avgDuration)}</td>
              <td class="text-right mono">${v.engagementRate.toFixed(2)}%</td>
              <td class="text-right mono ${(v.subsGained - v.subsLost) >= 0 ? 'kpi-positive' : 'kpi-negative'}">
                ${(v.subsGained - v.subsLost) >= 0 ? '+' : ''}${v.subsGained - v.subsLost}
              </td>
              ${totals.revenue > 0 ? `<td class="text-right mono text-green">${fmtMoney(v.revenue)}</td>` : ''}
              <td class="text-right text-muted">${v.publishedAt ? format(new Date(v.publishedAt), "MMM d, yy") : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  openPrintWindow("Video Performance Report", html);
}

// ── Single Video Report ───────────────────────────────────────────────

export function exportSingleVideoReport(video: VideoAnalytics & { engagementRate?: number }, dailyRows?: VideoAnalytics[]) {
  const html = `
    <div class="header">
      <div>
        <h1>${video.title || "Untitled Video"}</h1>
        <div class="subtitle">Individual Video Performance Report</div>
      </div>
      <div class="date">
        <span class="badge">Video Detail</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Performance Summary</div>
      <div class="kpi-grid">
        ${renderKpi("Views", fmtCount(video.views))}
        ${renderKpi("Impressions", fmtCount(video.impressions))}
        ${renderKpi("CTR", `${video.impressions_ctr.toFixed(2)}%`)}
        ${renderKpi("Avg Duration", fmtDuration(video.average_view_duration_seconds))}
        ${renderKpi("Likes", fmtCount(video.likes))}
        ${renderKpi("Comments", fmtCount(video.comments))}
        ${renderKpi("Shares", fmtCount(video.shares))}
        ${renderKpi("Net Subscribers", `+${video.subscribers_gained - video.subscribers_lost}`, '', (video.subscribers_gained - video.subscribers_lost) >= 0 ? 'kpi-positive' : 'kpi-negative')}
        ${renderKpi("Watch Time", `${Math.round(video.estimated_minutes_watched)}m`)}
        ${video.estimated_revenue > 0 ? renderKpi("Revenue", fmtMoney(video.estimated_revenue), '', 'kpi-positive') : ''}
      </div>
    </div>

    ${dailyRows && dailyRows.length > 0 ? `
    <div class="section">
      <div class="section-title">Daily Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="text-right">Views</th>
            <th class="text-right">Likes</th>
            <th class="text-right">Comments</th>
            <th class="text-right">CTR</th>
            <th class="text-right">Avg Duration</th>
            ${video.estimated_revenue > 0 ? '<th class="text-right">Revenue</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${dailyRows.sort((a, b) => a.date.localeCompare(b.date)).map((d) => `
            <tr>
              <td>${format(new Date(d.date), "MMM d, yyyy")}</td>
              <td class="text-right mono">${d.views.toLocaleString()}</td>
              <td class="text-right mono">${d.likes.toLocaleString()}</td>
              <td class="text-right mono">${d.comments.toLocaleString()}</td>
              <td class="text-right mono">${d.impressions_ctr.toFixed(2)}%</td>
              <td class="text-right mono">${fmtDuration(d.average_view_duration_seconds)}</td>
              ${video.estimated_revenue > 0 ? `<td class="text-right mono text-green">${fmtMoney(d.estimated_revenue)}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
  `;

  openPrintWindow(`${video.title || "Video"} Report`, html);
}

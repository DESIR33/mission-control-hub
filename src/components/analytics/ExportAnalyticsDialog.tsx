import { GenericExportDialog } from "@/components/crm/GenericExportDialog";
import type { ExportColumn } from "@/lib/export-utils";

interface AnalyticsRow {
  date: string;
  views: number | null;
  estimated_minutes_watched: number | null;
  subscribers_gained: number | null;
  subscribers_lost: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressions: number | null;
  estimated_revenue: number | null;
  [key: string]: unknown;
}

const ANALYTICS_COLUMNS: ExportColumn<AnalyticsRow>[] = [
  { key: "date", label: "Date" },
  { key: "views", label: "Views", getValue: (r) => String(r.views ?? 0) },
  { key: "estimated_minutes_watched", label: "Watch Time (min)", getValue: (r) => String(r.estimated_minutes_watched ?? 0) },
  { key: "subscribers_gained", label: "Subscribers Gained", getValue: (r) => String(r.subscribers_gained ?? 0) },
  { key: "subscribers_lost", label: "Subscribers Lost", getValue: (r) => String(r.subscribers_lost ?? 0) },
  { key: "likes", label: "Likes", getValue: (r) => String(r.likes ?? 0) },
  { key: "comments", label: "Comments", getValue: (r) => String(r.comments ?? 0) },
  { key: "shares", label: "Shares", getValue: (r) => String(r.shares ?? 0) },
  { key: "impressions", label: "Impressions", getValue: (r) => String(r.impressions ?? 0) },
  { key: "estimated_revenue", label: "Revenue", getValue: (r) => String(r.estimated_revenue ?? 0) },
];

export function ExportAnalyticsDialog({ data }: { data: AnalyticsRow[] }) {
  return (
    <GenericExportDialog
      title="Export Analytics"
      filenameBase="analytics_export"
      items={data}
      columns={ANALYTICS_COLUMNS}
      defaultSelectedCount={7}
      entityLabel="row"
    />
  );
}

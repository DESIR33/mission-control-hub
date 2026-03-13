import { GenericExportDialog } from "@/components/crm/GenericExportDialog";
import type { ExportColumn } from "@/lib/export-utils";
import type { Activity } from "@/types/crm";

const ACTIVITY_COLUMNS: ExportColumn<Activity>[] = [
  { key: "performed_at", label: "Date" },
  { key: "activity_type", label: "Type" },
  { key: "title", label: "Title", getValue: (a) => a.title ?? "" },
  { key: "description", label: "Description", getValue: (a) => a.description ?? "" },
  { key: "entity_type", label: "Entity Type" },
  { key: "entity_id", label: "Entity ID" },
  { key: "created_at", label: "Created At" },
];

export function ExportActivitiesDialog({ activities }: { activities: Activity[] }) {
  return (
    <GenericExportDialog
      title="Export Activities"
      filenameBase="activities_export"
      items={activities}
      columns={ACTIVITY_COLUMNS}
      defaultSelectedCount={5}
      entityLabel="activit"
    />
  );
}

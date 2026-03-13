import { GenericExportDialog } from "@/components/crm/GenericExportDialog";
import type { ExportColumn } from "@/lib/export-utils";
import type { Deal } from "@/hooks/use-deals";

const DEAL_COLUMNS: ExportColumn<Deal>[] = [
  { key: "title", label: "Title" },
  { key: "value", label: "Value", getValue: (d) => String(d.value ?? "") },
  { key: "currency", label: "Currency", getValue: (d) => d.currency ?? "USD" },
  { key: "stage", label: "Stage" },
  { key: "forecast_category", label: "Forecast Category", getValue: (d) => d.forecast_category ?? "" },
  { key: "contact_name", label: "Contact", getValue: (d) => d.contact ? `${d.contact.first_name} ${d.contact.last_name ?? ""}`.trim() : "" },
  { key: "contact_email", label: "Contact Email", getValue: (d) => d.contact?.email ?? "" },
  { key: "company_name", label: "Company", getValue: (d) => d.company?.name ?? "" },
  { key: "expected_close_date", label: "Expected Close", getValue: (d) => d.expected_close_date ?? "" },
  { key: "closed_at", label: "Closed At", getValue: (d) => d.closed_at ?? "" },
  { key: "notes", label: "Notes", getValue: (d) => d.notes ?? "" },
  { key: "created_at", label: "Created At" },
  { key: "updated_at", label: "Updated At" },
];

export function ExportDealsDialog({ deals }: { deals: Deal[] }) {
  return (
    <GenericExportDialog
      title="Export Deals"
      filenameBase="deals_export"
      items={deals}
      columns={DEAL_COLUMNS}
      defaultSelectedCount={9}
      entityLabel="deal"
    />
  );
}

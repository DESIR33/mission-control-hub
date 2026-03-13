import { GenericExportDialog } from "@/components/crm/GenericExportDialog";
import type { ExportColumn } from "@/lib/export-utils";
import type { AffiliateTransaction } from "@/hooks/use-affiliate-transactions";

const TRANSACTION_COLUMNS: ExportColumn<AffiliateTransaction>[] = [
  { key: "transaction_date", label: "Date", getValue: (t) => t.transaction_date ?? "" },
  { key: "description", label: "Description", getValue: (t) => t.description ?? "" },
  { key: "amount", label: "Amount", getValue: (t) => String(t.amount ?? 0) },
  { key: "sale_amount", label: "Sale Amount", getValue: (t) => String(t.sale_amount ?? 0) },
  { key: "currency", label: "Currency" },
  { key: "status", label: "Status" },
  { key: "affiliate_program_id", label: "Program ID", getValue: (t) => t.affiliate_program_id ?? "" },
  { key: "video_queue_id", label: "Video ID", getValue: (t) => t.video_queue_id ?? "" },
  { key: "created_at", label: "Created At" },
];

export function ExportRevenueDialog({ transactions }: { transactions: AffiliateTransaction[] }) {
  return (
    <GenericExportDialog
      title="Export Revenue Data"
      filenameBase="revenue_export"
      items={transactions}
      columns={TRANSACTION_COLUMNS}
      defaultSelectedCount={6}
      entityLabel="transaction"
    />
  );
}

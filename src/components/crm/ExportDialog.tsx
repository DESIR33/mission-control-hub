import { GenericExportDialog } from "@/components/crm/GenericExportDialog";
import type { ExportColumn } from "@/lib/export-utils";
import type { Contact, Company } from "@/types/crm";

const CONTACT_COLUMNS: ExportColumn<Contact>[] = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "role", label: "Role" },
  { key: "source", label: "Source" },
  { key: "vip_tier", label: "VIP Tier" },
  { key: "company_name", label: "Company", getValue: (c) => c.company?.name ?? "" },
  { key: "website", label: "Website" },
  { key: "social_twitter", label: "Twitter" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_instagram", label: "Instagram" },
  { key: "social_telegram", label: "Telegram" },
  { key: "social_whatsapp", label: "WhatsApp" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created At" },
];

const COMPANY_COLUMNS: ExportColumn<Company>[] = [
  { key: "name", label: "Company Name" },
  { key: "industry", label: "Industry" },
  { key: "website", label: "Website" },
  { key: "location", label: "Location" },
  { key: "size", label: "Size" },
  { key: "primary_email", label: "Email" },
  { key: "revenue", label: "Revenue" },
  { key: "vip_tier", label: "VIP Tier" },
  { key: "social_twitter", label: "Twitter" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_instagram", label: "Instagram" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_tiktok", label: "TikTok" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created At" },
];

export function ExportContactsDialog({ contacts }: { contacts: Contact[] }) {
  return (
    <GenericExportDialog
      title="Export Contacts"
      filenameBase="contacts_export"
      items={contacts}
      columns={CONTACT_COLUMNS}
      defaultSelectedCount={9}
      entityLabel="contact"
    />
  );
}

export function ExportCompaniesDialog({ companies }: { companies: Company[] }) {
  return (
    <GenericExportDialog
      title="Export Companies"
      filenameBase="companies_export"
      items={companies}
      columns={COMPANY_COLUMNS}
      defaultSelectedCount={8}
      entityLabel="compan"
    />
  );
}

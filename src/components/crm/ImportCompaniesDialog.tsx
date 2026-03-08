import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { CSVImportDialog } from "./CSVImportDialog";
import { useCreateCompany } from "@/hooks/use-companies";
import { toast } from "sonner";

const REQUIRED_FIELDS = [
  { key: "name", label: "Name" },
];

const OPTIONAL_FIELDS = [
  { key: "industry", label: "Industry" },
  { key: "website", label: "Website" },
  { key: "size", label: "Size" },
  { key: "location", label: "Location" },
  { key: "country", label: "Country" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "phone", label: "Phone Number" },
  { key: "description", label: "Description" },
  { key: "primary_email", label: "Email Address" },
  { key: "secondary_email", label: "Secondary Email" },
  { key: "revenue", label: "Revenue" },
  { key: "notes", label: "Notes" },
  { key: "vip_tier", label: "VIP Tier" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_twitter", label: "Twitter" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_instagram", label: "Instagram" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_tiktok", label: "TikTok" },
  { key: "social_producthunt", label: "Product Hunt" },
  { key: "social_whatsapp", label: "WhatsApp" },
];

export function ImportCompaniesDialog() {
  const [open, setOpen] = useState(false);
  const createCompany = useCreateCompany();

  const handleImport = async (rows: Record<string, string>[]) => {
    const valid = rows.filter((r) => r.name?.trim());
    if (valid.length === 0) throw new Error("No valid rows found. Company Name is required.");

    let failed = 0;
    for (const row of valid) {
      try {
        const trimOrUndefined = (v?: string) => {
          const t = v?.trim();
          return t || undefined;
        };

        await createCompany.mutateAsync({
          name: row.name.trim(),
          industry: trimOrUndefined(row.industry),
          website: trimOrUndefined(row.website),
          location: trimOrUndefined(row.location),
          size: trimOrUndefined(row.size),
          revenue: trimOrUndefined(row.revenue),
          primary_email: trimOrUndefined(row.primary_email),
          secondary_email: trimOrUndefined(row.secondary_email),
          description: trimOrUndefined(row.description),
          notes: trimOrUndefined(row.notes),
          vip_tier: trimOrUndefined(row.vip_tier),
          social_linkedin: trimOrUndefined(row.social_linkedin),
          social_twitter: trimOrUndefined(row.social_twitter),
          social_facebook: trimOrUndefined(row.social_facebook),
          social_instagram: trimOrUndefined(row.social_instagram),
          social_youtube: trimOrUndefined(row.social_youtube),
          social_tiktok: trimOrUndefined(row.social_tiktok),
          social_producthunt: trimOrUndefined(row.social_producthunt),
        });
      } catch {
        failed++;
      }
    }

    const imported = valid.length - failed;
    if (failed > 0) {
      toast.warning(`Imported ${imported} compan${imported !== 1 ? "ies" : "y"}. ${failed} row${failed !== 1 ? "s" : ""} failed.`);
    } else {
      toast.success(`Imported ${imported} compan${imported !== 1 ? "ies" : "y"} successfully.`);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="w-3.5 h-3.5 mr-1.5" />
        Import CSV
      </Button>

      <CSVImportDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onImport={handleImport}
        requiredFields={REQUIRED_FIELDS}
        optionalFields={OPTIONAL_FIELDS}
      />
    </>
  );
}

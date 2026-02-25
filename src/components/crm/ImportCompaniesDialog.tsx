import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { CSVImportDialog } from "./CSVImportDialog";
import { useCreateCompany } from "@/hooks/use-companies";
import { toast } from "sonner";

const REQUIRED_FIELDS = [
  { key: "name", label: "Company Name" },
];

const OPTIONAL_FIELDS = [
  { key: "industry", label: "Industry" },
  { key: "website", label: "Website" },
  { key: "location", label: "Location" },
  { key: "size", label: "Size" },
  { key: "revenue", label: "Revenue" },
  { key: "primary_email", label: "Primary Email" },
  { key: "description", label: "Description" },
  { key: "notes", label: "Notes" },
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
        await createCompany.mutateAsync({
          name: row.name.trim(),
          industry: row.industry?.trim() || undefined,
          website: row.website?.trim() || undefined,
          location: row.location?.trim() || undefined,
          size: row.size?.trim() || undefined,
          revenue: row.revenue?.trim() || undefined,
          primary_email: row.primary_email?.trim() || undefined,
          description: row.description?.trim() || undefined,
          notes: row.notes?.trim() || undefined,
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

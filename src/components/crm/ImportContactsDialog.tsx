import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { CSVImportDialog } from "./CSVImportDialog";
import { useCreateContact } from "@/hooks/use-contacts";
import { toast } from "sonner";

const REQUIRED_FIELDS = [
  { key: "first_name", label: "First Name" },
];

const OPTIONAL_FIELDS = [
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
];

export function ImportContactsDialog() {
  const [open, setOpen] = useState(false);
  const createContact = useCreateContact();

  const handleImport = async (rows: Record<string, string>[]) => {
    const valid = rows.filter((r) => r.first_name?.trim());
    if (valid.length === 0) throw new Error("No valid rows found. First Name is required.");

    let failed = 0;
    for (const row of valid) {
      try {
        await createContact.mutateAsync({
          first_name: row.first_name.trim(),
          last_name: row.last_name?.trim() || undefined,
          email: row.email?.trim() || undefined,
          phone: row.phone?.trim() || undefined,
          role: row.role?.trim() || undefined,
          status: row.status?.trim() || undefined,
          source: row.source?.trim() || undefined,
          notes: row.notes?.trim() || undefined,
        });
      } catch {
        failed++;
      }
    }

    const imported = valid.length - failed;
    if (failed > 0) {
      toast.warning(`Imported ${imported} contact${imported !== 1 ? "s" : ""}. ${failed} row${failed !== 1 ? "s" : ""} failed.`);
    } else {
      toast.success(`Imported ${imported} contact${imported !== 1 ? "s" : ""} successfully.`);
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

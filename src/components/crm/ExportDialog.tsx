import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import type { Contact, Company } from "@/types/crm";

const CONTACT_COLUMNS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "role", label: "Role" },
  { key: "source", label: "Source" },
  { key: "vip_tier", label: "VIP Tier" },
  { key: "company_name", label: "Company" },
  { key: "website", label: "Website" },
  { key: "social_twitter", label: "Twitter" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_instagram", label: "Instagram" },
  { key: "social_telegram", label: "Telegram" },
  { key: "social_whatsapp", label: "WhatsApp" },
  { key: "social_discord", label: "Discord" },
  { key: "notes", label: "Notes" },
  { key: "created_at", label: "Created At" },
] as const;

const COMPANY_COLUMNS = [
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
] as const;

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getContactValue(contact: Contact, key: string): string {
  if (key === "company_name") return contact.company?.name ?? "";
  return String((contact as unknown as Record<string, unknown>)[key] ?? "");
}

function getCompanyValue(company: Company, key: string): string {
  return String((company as unknown as Record<string, unknown>)[key] ?? "");
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

interface ExportContactsDialogProps {
  contacts: Contact[];
}

export function ExportContactsDialog({ contacts }: ExportContactsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(CONTACT_COLUMNS.slice(0, 9).map((c) => c.key))
  );
  const [format, setFormat] = useState("csv");

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const cols = CONTACT_COLUMNS.filter((c) => selectedCols.has(c.key));
    const header = cols.map((c) => escapeCsv(c.label)).join(",");
    const rows = contacts.map((contact) =>
      cols.map((c) => escapeCsv(getContactValue(contact, c.key))).join(",")
    );
    const csv = [header, ...rows].join("\n");
    downloadCsv(`contacts_export_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Export Contacts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Columns ({selectedCols.size} selected)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto p-1">
              {CONTACT_COLUMNS.map((col) => (
                <div key={col.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`col_${col.key}`}
                    checked={selectedCols.has(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  />
                  <label htmlFor={`col_${col.key}`} className="text-sm cursor-pointer">
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""} will be exported
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleExport} disabled={selectedCols.size === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ExportCompaniesDialogProps {
  companies: Company[];
}

export function ExportCompaniesDialog({ companies }: ExportCompaniesDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(COMPANY_COLUMNS.slice(0, 8).map((c) => c.key))
  );
  const [format, setFormat] = useState("csv");

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const cols = COMPANY_COLUMNS.filter((c) => selectedCols.has(c.key));
    const header = cols.map((c) => escapeCsv(c.label)).join(",");
    const rows = companies.map((company) =>
      cols.map((c) => escapeCsv(getCompanyValue(company, c.key))).join(",")
    );
    const csv = [header, ...rows].join("\n");
    downloadCsv(`companies_export_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Export Companies</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Columns ({selectedCols.size} selected)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto p-1">
              {COMPANY_COLUMNS.map((col) => (
                <div key={col.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`ccol_${col.key}`}
                    checked={selectedCols.has(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  />
                  <label htmlFor={`ccol_${col.key}`} className="text-sm cursor-pointer">
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {companies.length} compan{companies.length !== 1 ? "ies" : "y"} will be exported
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleExport} disabled={selectedCols.size === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

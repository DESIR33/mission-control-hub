import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

const SUBSCRIBER_FIELDS = [
  { value: "__skip__", label: "— Skip —" },
  { value: "email", label: "Email" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "source", label: "Source" },
  { value: "source_video_id", label: "Source Video ID" },
  { value: "source_video_title", label: "Source Video Title" },
  { value: "guide_requested", label: "Guide Requested" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "country", label: "Country" },
  { value: "page_url", label: "Page URL" },
  { value: "referrer", label: "Referrer" },
  { value: "notes", label: "Notes" },
];

function autoMapField(header: string): string {
  const h = header.toLowerCase().trim().replace(/[\s_-]+/g, "_");
  const map: Record<string, string> = {
    email: "email",
    email_address: "email",
    e_mail: "email",
    first_name: "first_name",
    firstname: "first_name",
    first: "first_name",
    last_name: "last_name",
    lastname: "last_name",
    last: "last_name",
    source: "source",
    city: "city",
    state: "state",
    country: "country",
    notes: "notes",
    page_url: "page_url",
    referrer: "referrer",
    guide_requested: "guide_requested",
    guide: "guide_requested",
    source_video_id: "source_video_id",
    video_id: "source_video_id",
    source_video_title: "source_video_title",
    video_title: "source_video_title",
  };
  return map[h] || "__skip__";
}

function parseCSV(text: string): ParsedData {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

type Step = "upload" | "map" | "importing" | "done";

export function ImportSubscribersDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const reset = () => {
    setStep("upload");
    setParsed(null);
    setFileName("");
    setMapping({});
    setImportResult(null);
  };

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);
      if (data.headers.length === 0) {
        toast.error("Could not parse CSV. Check the file format.");
        return;
      }
      setParsed(data);
      setFileName(file.name);
      const autoMap: Record<string, string> = {};
      data.headers.forEach((h) => {
        autoMap[h] = autoMapField(h);
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const hasEmailMapping = Object.values(mapping).includes("email");

  const handleImport = async () => {
    if (!parsed || !workspaceId) return;
    setStep("importing");

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Build mapped rows
    const mappedRows: Record<string, any>[] = [];
    for (const row of parsed.rows) {
      const mapped: Record<string, any> = { workspace_id: workspaceId, status: "active" };
      for (const [csvCol, dbField] of Object.entries(mapping)) {
        if (dbField !== "__skip__" && row[csvCol]) {
          mapped[dbField] = row[csvCol];
        }
      }
      if (!mapped.email) {
        skipped++;
        continue;
      }
      if (!mapped.source) mapped.source = "import";
      mappedRows.push(mapped);
    }

    // Batch upsert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < mappedRows.length; i += chunkSize) {
      const chunk = mappedRows.slice(i, i + chunkSize);
      const { error, data } = await supabase
        .from("subscribers" as any)
        .upsert(chunk as any, { onConflict: "workspace_id,email" })
        .select("id");

      if (error) {
        errors.push(`Batch ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
      } else {
        imported += (data as any[])?.length ?? chunk.length;
      }
    }

    setImportResult({ imported, skipped, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["subscribers", workspaceId] });

    if (errors.length === 0) {
      toast.success(`Imported ${imported} subscribers`);
    } else {
      toast.warning(`Imported ${imported} with ${errors.length} batch error(s)`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-4 h-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Subscribers from CSV</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-foreground font-medium">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports standard CSV format</p>
          </div>
        )}

        {/* Step 2: Map fields */}
        {step === "map" && parsed && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{fileName}</span> — {parsed.rows.length} rows found
            </p>

            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {parsed.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-sm text-foreground truncate min-w-0 flex-1">{header}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <Select
                    value={mapping[header] || "__skip__"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [header]: v }))}
                  >
                    <SelectTrigger className="w-44 bg-secondary border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIBER_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {parsed.rows.length > 0 && (
              <div className="border border-border rounded-md overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {parsed.headers.slice(0, 5).map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium truncate max-w-[120px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {parsed.headers.slice(0, 5).map((h) => (
                          <td key={h} className="px-2 py-1.5 text-foreground truncate max-w-[120px]">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!hasEmailMapping && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                You must map at least one column to Email
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={!hasEmailMapping}>
                Import {parsed.rows.length} Subscribers
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Importing subscribers…</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Import Complete</p>
                <p className="text-xs text-muted-foreground">
                  {importResult.imported} imported, {importResult.skipped} skipped
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => { setOpen(false); reset(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

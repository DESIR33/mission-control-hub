import { useState, useRef } from "react";
import {
  parseCSV,
  useBulkImportContacts,
  useImportJobs,
  type ParsedRow,
} from "@/hooks/use-bulk-import";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Youtube,
  Loader2,
} from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const CONTACT_FIELDS: { value: string; label: string }[] = [
  { value: "", label: "-- Skip --" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "title", label: "Title" },
  { value: "website", label: "Website" },
  { value: "social_youtube", label: "YouTube Channel" },
  { value: "social_twitter", label: "Twitter" },
  { value: "social_linkedin", label: "LinkedIn" },
  { value: "social_instagram", label: "Instagram" },
  { value: "notes", label: "Notes" },
];

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Upload",
  2: "Map Fields",
  3: "Enrichment",
  4: "Import",
  5: "Results",
};

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {([1, 2, 3, 4, 5] as WizardStep[]).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
              step === current
                ? "bg-primary text-primary-foreground"
                : step < current
                  ? "bg-green-600 text-white"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {step < current ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              step
            )}
          </div>
          {step < 5 && (
            <div
              className={`w-8 h-0.5 mx-1 ${
                step < current ? "bg-green-600" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-3 text-sm font-medium text-muted-foreground">
        {STEP_LABELS[current]}
      </span>
    </div>
  );
}

function UploadStep({
  onParsed,
}: {
  onParsed: (fileName: string, headers: string[], rows: ParsedRow[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0 || rows.length === 0) {
          setError("CSV must have at least a header row and one data row.");
          return;
        }
        onParsed(file.name, headers, rows);
      } catch {
        setError("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">Click to upload or drag a CSV file</p>
        <p className="text-xs text-muted-foreground mt-1">Only .csv files are supported</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: ParsedRow[] }) {
  const preview = rows.slice(0, 5);
  return (
    <ScrollArea className="h-[180px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h} className="whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((row, i) => (
            <TableRow key={i}>
              {headers.map((h) => (
                <TableCell key={h} className="whitespace-nowrap">
                  {row[h] || ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function FieldMappingStep({
  headers,
  mapping,
  onMappingChange,
}: {
  headers: string[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}) {
  const handleChange = (csvCol: string, dbField: string) => {
    const next = { ...mapping };
    if (dbField === "") {
      delete next[csvCol];
    } else {
      next[csvCol] = dbField;
    }
    onMappingChange(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map each CSV column to a contact field. Unmapped columns will be skipped.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {headers.map((h) => (
          <div key={h} className="flex items-center gap-3">
            <div className="min-w-[120px] text-sm font-medium truncate" title={h}>
              {h}
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select
              value={mapping[h] ?? ""}
              onValueChange={(val) => handleChange(h, val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Skip" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value || "__skip__"}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnrichmentStep({
  enrichYouTube,
  onToggle,
}: {
  enrichYouTube: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Youtube className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium">YouTube Channel Enrichment</p>
              <p className="text-xs text-muted-foreground">
                Automatically enrich contacts that have a YouTube channel URL
              </p>
            </div>
          </div>
          <Switch checked={enrichYouTube} onCheckedChange={onToggle} />
        </div>
        {enrichYouTube && (
          <div className="ml-13 pl-4 border-l border-border space-y-2">
            <p className="text-xs text-muted-foreground">
              When enabled, contacts with a YouTube channel or website URL will be queued for
              enrichment. This adds subscriber count, video count, and channel metadata to each
              contact record, and calculates a sponsor fit score.
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary">Subscriber Count</Badge>
              <Badge variant="secondary">Video Count</Badge>
              <Badge variant="secondary">Sponsor Fit Score</Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportStep({
  processed,
  total,
  errors,
}: {
  processed: number;
  total: number;
  errors: any[];
}) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm font-medium">Importing contacts...</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono">
            {processed} / {total}
          </span>
        </div>
        <Progress value={pct} />
      </div>
      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">
            Errors ({errors.length})
          </p>
          <ScrollArea className="h-[100px] rounded-md border p-2">
            {errors.map((err, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                Row {err.row}: {err.error}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function ResultsStep({
  processed,
  enriched,
  errors,
}: {
  processed: number;
  enriched: number;
  errors: any[];
}) {
  const successful = processed - errors.length;
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
        <p className="text-lg font-semibold">Import Complete</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{successful}</p>
          <p className="text-xs text-muted-foreground">Imported</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{enriched}</p>
          <p className="text-xs text-muted-foreground">Enriched</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{errors.length}</p>
          <p className="text-xs text-muted-foreground">Errors</p>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Error Details</p>
          <ScrollArea className="h-[120px] rounded-md border p-2">
            {errors.map((err, i) => (
              <div key={i} className="text-xs text-muted-foreground py-0.5">
                <span className="font-medium">Row {err.row}:</span> {err.error}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function BulkImportWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [enrichYouTube, setEnrichYouTube] = useState(false);
  const [importResult, setImportResult] = useState<{
    processed: number;
    enriched: number;
    errors: any[];
  } | null>(null);

  const bulkImport = useBulkImportContacts();

  const resetWizard = () => {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setFieldMapping({});
    setEnrichYouTube(false);
    setImportResult(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetWizard();
    }
  };

  const handleParsed = (name: string, hdrs: string[], parsedRows: ParsedRow[]) => {
    setFileName(name);
    setHeaders(hdrs);
    setRows(parsedRows);

    // Auto-map obvious fields
    const autoMap: Record<string, string> = {};
    for (const h of hdrs) {
      const lower = h.toLowerCase().replace(/[_\s-]/g, "");
      if (lower === "firstname" || lower === "first") autoMap[h] = "first_name";
      else if (lower === "lastname" || lower === "last") autoMap[h] = "last_name";
      else if (lower === "email" || lower === "emailaddress") autoMap[h] = "email";
      else if (lower === "phone" || lower === "phonenumber") autoMap[h] = "phone";
      else if (lower === "website" || lower === "url") autoMap[h] = "website";
      else if (lower === "youtube" || lower === "youtubechannel") autoMap[h] = "social_youtube";
      else if (lower === "twitter") autoMap[h] = "social_twitter";
      else if (lower === "linkedin") autoMap[h] = "social_linkedin";
      else if (lower === "title" || lower === "jobtitle") autoMap[h] = "title";
      else if (lower === "notes") autoMap[h] = "notes";
    }
    setFieldMapping(autoMap);
    setStep(2);
  };

  const handleStartImport = async () => {
    setStep(4);

    // Clean mapping: remove __skip__ entries
    const cleanMapping: Record<string, string> = {};
    for (const [k, v] of Object.entries(fieldMapping)) {
      if (v && v !== "__skip__") {
        cleanMapping[k] = v;
      }
    }

    try {
      const result = await bulkImport.mutateAsync({
        rows,
        fieldMapping: cleanMapping,
        fileName,
        enrichYouTube,
      });
      setImportResult({
        processed: result.processed,
        enriched: result.enriched,
        errors: result.errors,
      });
      setStep(5);
    } catch {
      // Error handled by mutation onError
      setImportResult({
        processed: 0,
        enriched: 0,
        errors: [{ row: 0, error: "Import failed" }],
      });
      setStep(5);
    }
  };

  const hasMappedFirstName = Object.values(fieldMapping).includes("first_name");

  const canProceed = (): boolean => {
    if (step === 1) return false; // handled by file upload
    if (step === 2) return hasMappedFirstName;
    if (step === 3) return true;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileUp className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Contacts</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {/* Step 1: Upload */}
        {step === 1 && <UploadStep onParsed={handleParsed} />}

        {/* Step 1 -> 2 preview */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <Badge variant="secondary">{rows.length} rows</Badge>
            </div>
            <PreviewTable headers={headers} rows={rows} />
            <FieldMappingStep
              headers={headers}
              mapping={fieldMapping}
              onMappingChange={setFieldMapping}
            />
            {!hasMappedFirstName && (
              <div className="flex items-center gap-2 text-amber-600 text-xs">
                <AlertCircle className="w-3 h-3" />
                You must map at least one column to "First Name" to proceed.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Enrichment */}
        {step === 3 && (
          <EnrichmentStep enrichYouTube={enrichYouTube} onToggle={setEnrichYouTube} />
        )}

        {/* Step 4: Import progress */}
        {step === 4 && (
          <ImportStep
            processed={importResult?.processed ?? 0}
            total={rows.length}
            errors={importResult?.errors ?? []}
          />
        )}

        {/* Step 5: Results */}
        {step === 5 && importResult && (
          <ResultsStep
            processed={importResult.processed}
            enriched={importResult.enriched}
            errors={importResult.errors}
          />
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2 border-t">
          <div>
            {step > 1 && step < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((step - 1) as WizardStep)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 5 && (
              <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            )}
            {step === 2 && (
              <Button size="sm" disabled={!canProceed()} onClick={() => setStep(3)}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button size="sm" onClick={handleStartImport}>
                Start Import
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

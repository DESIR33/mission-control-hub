import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, FileUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (mappedData: any[]) => Promise<void>;
  requiredFields: { key: string; label: string }[];
  optionalFields?: { key: string; label: string }[];
}

/** RFC 4180–aware CSV line parser (handles quoted fields with commas) */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
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
}

export function CSVImportDialog({
  isOpen,
  onClose,
  onImport,
  requiredFields,
  optionalFields = [],
}: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0)
          .map(parseCSVLine);

        setPreviewData(lines);

        // Auto-map columns based on header names
        const headers = lines[0] ?? [];
        const newMappings: Record<string, number> = {};

        [...requiredFields, ...(optionalFields || [])].forEach((field) => {
          const index = headers.findIndex(
            (header) =>
              header.toLowerCase() === field.label.toLowerCase() ||
              header.toLowerCase() === field.key.toLowerCase() ||
              header.toLowerCase().replace(/[_\s]/g, "") ===
                field.key.toLowerCase().replace(/[_\s]/g, "")
          );
          if (index !== -1) {
            newMappings[field.key] = index;
          }
        });

        setColumnMappings(newMappings);
      } catch {
        setError("Failed to parse CSV file. Please ensure it's a valid CSV format.");
        setFile(null);
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleColumnMapping = (field: string, columnIndex: string) => {
    if (columnIndex === "__none__") {
      setColumnMappings((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      setColumnMappings((prev) => ({ ...prev, [field]: parseInt(columnIndex) }));
    }
  };

  const handleImport = async () => {
    if (!file || !previewData.length) return;

    const missingFields = requiredFields.filter(
      (field) => columnMappings[field.key] === undefined
    );

    if (missingFields.length > 0) {
      setError(
        `Please map the following required fields: ${missingFields.map((f) => f.label).join(", ")}`
      );
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const data = previewData.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        [...requiredFields, ...optionalFields].forEach((field) => {
          const columnIndex = columnMappings[field.key];
          if (columnIndex !== undefined) {
            obj[field.key] = row[columnIndex] || "";
          }
        });
        return obj;
      });

      await onImport(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import data");
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData([]);
    setColumnMappings({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const allFields = [...requiredFields, ...optionalFields];
  const mappedCount = Object.keys(columnMappings).length;
  const headers = previewData[0] ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {!file ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Select CSV File
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                Only .csv files are supported
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {previewData.length - 1} rows · {headers.length} columns
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile} aria-label="Remove file">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Column mapping */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Map Columns</h4>
                  <span className="text-xs text-muted-foreground">
                    {mappedCount}/{allFields.length} mapped
                  </span>
                </div>

                <ScrollArea className="max-h-[280px]">
                  <div className="grid gap-3 sm:grid-cols-2 pr-3">
                    {requiredFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs font-medium">
                          {field.label} <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={columnMappings[field.key]?.toString()}
                          onValueChange={(value) => handleColumnMapping(field.key, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.map((header, index) => (
                              <SelectItem key={index} value={index.toString()} className="text-xs">
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    {optionalFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs font-medium">{field.label}</Label>
                        <Select
                          value={columnMappings[field.key]?.toString() ?? "__none__"}
                          onValueChange={(value) => handleColumnMapping(field.key, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Skip" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs text-muted-foreground">
                              — Skip —
                            </SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={index} value={index.toString()} className="text-xs">
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Preview (first 5 rows)</h4>
                <div className="rounded-md border overflow-hidden">
                  <ScrollArea className="h-[160px]">
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow>
                            {headers.map((header, index) => (
                              <TableHead key={index} className="whitespace-nowrap text-xs px-2 py-1.5">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(1, 6).map((row, i) => (
                            <TableRow key={i}>
                              {row.map((cell, j) => (
                                <TableCell key={j} className="whitespace-nowrap px-2 py-1 max-w-[180px] truncate">
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : `Import ${previewData.length - 1} rows`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

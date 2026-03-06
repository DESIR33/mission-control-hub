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
        const lines = csvText.split('\n').map(line =>
          line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        );
        setPreviewData(lines);

        // Try to auto-map columns based on header names
        const headers = lines[0];
        const newMappings: Record<string, number> = {};

        [...requiredFields, ...(optionalFields || [])].forEach(field => {
          const index = headers.findIndex(header =>
            header.toLowerCase() === field.label.toLowerCase() ||
            header.toLowerCase() === field.key.toLowerCase()
          );
          if (index !== -1) {
            newMappings[field.key] = index;
          }
        });

        setColumnMappings(newMappings);
      } catch (err) {
        setError('Failed to parse CSV file. Please ensure it\'s a valid CSV format.');
        setFile(null);
        setPreviewData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleColumnMapping = (field: string, columnIndex: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [field]: parseInt(columnIndex)
    }));
  };

  const handleImport = async () => {
    if (!file || !previewData.length) return;

    // Validate required fields are mapped
    const missingFields = requiredFields.filter(field =>
      columnMappings[field.key] === undefined
    );

    if (missingFields.length > 0) {
      setError(`Please map the following required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setImporting(true);
    setError(null);

    try {
      // Convert CSV data to objects using mappings
      const data = previewData.slice(1).map(row => {
        const obj: Record<string, string> = {};
        [...requiredFields, ...optionalFields].forEach(field => {
          const columnIndex = columnMappings[field.key];
          if (columnIndex !== undefined) {
            obj[field.key] = row[columnIndex] || '';
          }
        });
        return obj;
      });

      await onImport(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewData([]);
    setColumnMappings({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Map Columns</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {requiredFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`map-${field.key}`} className="text-sm font-medium">
                        {field.label} <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={columnMappings[field.key]?.toString()}
                        onValueChange={(value) => handleColumnMapping(field.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {previewData[0]?.map((header, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}

                  {optionalFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`map-${field.key}`} className="text-sm font-medium">{field.label}</Label>
                      <Select
                        value={columnMappings[field.key]?.toString()}
                        onValueChange={(value) => handleColumnMapping(field.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {previewData[0]?.map((header, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Preview</h4>
                <ScrollArea className="h-[200px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData[0]?.map((header, index) => (
                          <TableHead key={index}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(1, 6).map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

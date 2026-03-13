import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { exportData, type ExportColumn } from "@/lib/export-utils";

interface GenericExportDialogProps<T> {
  title: string;
  filenameBase: string;
  items: T[];
  columns: ExportColumn<T>[];
  defaultSelectedCount?: number;
  entityLabel: string;
}

export function GenericExportDialog<T>({
  title,
  filenameBase,
  items,
  columns,
  defaultSelectedCount,
  entityLabel,
}: GenericExportDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const defaultCount = defaultSelectedCount ?? Math.min(columns.length, 8);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    new Set(columns.slice(0, defaultCount).map((c) => c.key)),
  );
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const cols = columns.filter((c) => selectedCols.has(c.key));
    exportData(items, cols, filenameBase, format);
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
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Columns ({selectedCols.size} selected)</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto p-1">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`exp_${col.key}`}
                    checked={selectedCols.has(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  />
                  <Label htmlFor={`exp_${col.key}`} className="text-sm cursor-pointer">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {items.length} {entityLabel}{items.length !== 1 ? "s" : ""} will be exported
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

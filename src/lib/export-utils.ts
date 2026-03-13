/**
 * Shared export utilities for CSV and JSON formats.
 */

export interface ExportColumn<T> {
  key: string;
  label: string;
  getValue?: (item: T) => string;
}

export function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv<T>(
  items: T[],
  columns: ExportColumn<T>[],
): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const rows = items.map((item) =>
    columns
      .map((c) => {
        const val = c.getValue
          ? c.getValue(item)
          : String((item as Record<string, unknown>)[c.key] ?? "");
        return escapeCsv(val);
      })
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function buildJson<T>(
  items: T[],
  columns: ExportColumn<T>[],
): string {
  const mapped = items.map((item) => {
    const obj: Record<string, string> = {};
    for (const c of columns) {
      obj[c.label] = c.getValue
        ? c.getValue(item)
        : String((item as Record<string, unknown>)[c.key] ?? "");
    }
    return obj;
  });
  return JSON.stringify(mapped, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportData<T>(
  items: T[],
  columns: ExportColumn<T>[],
  filenameBase: string,
  format: "csv" | "json",
) {
  const date = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    downloadFile(`${filenameBase}_${date}.json`, buildJson(items, columns), "application/json");
  } else {
    downloadFile(`${filenameBase}_${date}.csv`, buildCsv(items, columns), "text/csv");
  }
}

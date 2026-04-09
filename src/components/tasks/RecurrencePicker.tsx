import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

interface RecurrencePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const rules = [
  { value: "", label: "No recurrence" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
        <RefreshCw className="h-3 w-3" /> Recurrence
      </label>
      <Select value={value || ""} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger>
          <SelectValue placeholder="No recurrence" />
        </SelectTrigger>
        <SelectContent>
          {rules.map((r) => (
            <SelectItem key={r.value} value={r.value || "none"}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

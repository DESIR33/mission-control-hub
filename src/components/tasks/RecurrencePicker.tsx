import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <Select value={value || ""} onValueChange={(v) => onChange(v || null)}>
      <SelectTrigger className="w-auto h-7 text-xs border-none shadow-none px-2 gap-1">
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        {rules.map((r) => (
          <SelectItem key={r.value} value={r.value || "none"}>{r.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

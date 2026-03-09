import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAlertThreshold } from "@/hooks/use-agent-alert-thresholds";

const METRIC_OPTIONS = [
  { value: "daily_views", label: "Daily Views" },
  { value: "ctr", label: "Click-Through Rate (%)" },
  { value: "subscriber_growth", label: "Daily Subscriber Growth" },
  { value: "watch_time_hours", label: "Watch Time (hours)" },
  { value: "revenue_daily", label: "Daily Revenue ($)" },
  { value: "avg_view_duration", label: "Avg View Duration (sec)" },
  { value: "impressions", label: "Daily Impressions" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentSlug?: string;
}

export function CreateAlertThresholdDialog({ open, onOpenChange, agentSlug }: Props) {
  const [metricName, setMetricName] = useState("");
  const [condition, setCondition] = useState("drops_below");
  const [thresholdValue, setThresholdValue] = useState("");
  const [cooldownHours, setCooldownHours] = useState("24");
  const createThreshold = useCreateAlertThreshold();

  const handleSubmit = () => {
    if (!metricName || !thresholdValue) return;
    createThreshold.mutate({
      agent_slug: agentSlug || "growth-optimizer",
      metric_name: metricName,
      condition,
      threshold_value: Number(thresholdValue),
      cooldown_hours: Number(cooldownHours) || 24,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setMetricName("");
        setThresholdValue("");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert Threshold</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Metric</Label>
            <Select value={metricName} onValueChange={setMetricName}>
              <SelectTrigger><SelectValue placeholder="Select metric..." /></SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drops_below">Drops Below</SelectItem>
                <SelectItem value="exceeds">Exceeds</SelectItem>
                <SelectItem value="changes_by_percent">Changes by %</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Threshold Value</Label>
            <Input type="number" value={thresholdValue} onChange={(e) => setThresholdValue(e.target.value)} placeholder="e.g. 100" />
          </div>
          <div>
            <Label>Cooldown (hours)</Label>
            <Input type="number" value={cooldownHours} onChange={(e) => setCooldownHours(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!metricName || !thresholdValue} className="w-full">
            Create Alert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

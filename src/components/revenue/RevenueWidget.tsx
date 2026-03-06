import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export interface RevenueMetric {
  id: string;
  title: string;
  type: "amount" | "percentage" | "count";
  value: number;
  period: "daily" | "weekly" | "monthly" | "yearly" | "total";
  source: "affiliate" | "sponsorship" | "product" | "custom" | "all";
}

interface RevenueWidgetProps {
  metric: RevenueMetric;
  onUpdate: (metric: RevenueMetric) => void;
  onDelete: (id: string) => void;
}

export function RevenueWidget({ metric, onUpdate, onDelete }: RevenueWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case "amount":
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "count":
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {metric.title}
          </p>
          <p className="text-2xl font-bold font-mono text-card-foreground">
            {formatValue(metric.value, metric.type)}
          </p>
          <p className="text-xs text-muted-foreground capitalize font-mono">
            {metric.period} · {metric.source}
          </p>
        </div>
        <div className="flex items-center gap-0.5 ml-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
            aria-label="Edit widget"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Delete widget">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Widget</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove this widget from your dashboard?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(metric.id)}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Widget</DialogTitle>
            <DialogDescription>
              Update widget settings
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onUpdate({
                ...metric,
                title: formData.get("title") as string,
                type: formData.get("type") as RevenueMetric["type"],
                period: formData.get("period") as RevenueMetric["period"],
                source: formData.get("source") as RevenueMetric["source"],
              });
              setIsEditing(false);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Widget Title</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={metric.title}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Display Type</Label>
                <Select name="type" defaultValue={metric.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Currency Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-period">Time Period</Label>
                <Select name="period" defaultValue={metric.period}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-source">Revenue Source</Label>
                <Select name="source" defaultValue={metric.source}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="sponsorship">Sponsorship</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

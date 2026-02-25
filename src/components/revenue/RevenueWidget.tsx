import { useState } from "react";
import { DollarSign, Pencil, Trash2, TrendingUp, Hash } from "lucide-react";
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

  const getIcon = () => {
    switch (metric.type) {
      case "amount":
        return <DollarSign className="h-5 w-5 text-primary" />;
      case "percentage":
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case "count":
        return <Hash className="h-5 w-5 text-primary" />;
      default:
        return <DollarSign className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2">
            {getIcon()}
          </div>
          <span className="text-sm font-medium text-muted-foreground">{metric.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Trash2 className="h-3.5 w-3.5" />
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
      <div className="text-3xl font-bold tracking-tight">
        {formatValue(metric.value, metric.type)}
      </div>
      <div className="text-xs text-muted-foreground capitalize">
        {metric.period} · {metric.source}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="rounded-3xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.05)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.02)] border border-border">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold">Edit Widget</DialogTitle>
            <DialogDescription className="text-muted-foreground">
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

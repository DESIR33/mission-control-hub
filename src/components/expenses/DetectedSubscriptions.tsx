import { useState, useMemo } from "react";
import { Sparkles, ChevronDown, ChevronRight, Plus, X, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useExpenses,
  useRecurringSubscriptions,
  useCreateSubscription,
  type ExpenseCategory,
} from "@/hooks/use-expenses";
import {
  useSubscriptionDetection,
  type DetectedSubscription,
} from "@/hooks/use-subscription-detection";

interface Props {
  categories: ExpenseCategory[];
}

const CONFIDENCE_STYLES = {
  high: { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2, label: "High" },
  medium: { bg: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: AlertTriangle, label: "Medium" },
  low: { bg: "bg-muted text-muted-foreground border-border", icon: Info, label: "Low" },
};

function normalizeVendor(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function DetectedSubscriptions({ categories }: Props) {
  const { data: expenses = [] } = useExpenses();
  const { data: subs = [] } = useRecurringSubscriptions();
  const createSub = useCreateSubscription();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const existingVendors = useMemo(
    () => new Set(subs.map((s) => normalizeVendor(s.name || s.vendor || ""))),
    [subs]
  );

  const detected = useSubscriptionDetection(expenses, existingVendors);

  const visible = detected.filter((d) => !dismissed.has(normalizeVendor(d.vendor)));

  if (visible.length === 0) return null;

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const handleConvert = async (det: DetectedSubscription) => {
    await createSub.mutateAsync({
      name: det.vendor,
      amount: det.avgAmount,
      billing_cycle: det.billingCycle,
      start_date: det.latestExpense.expense_date,
      category_id: det.categoryId,
      vendor: det.vendor,
      is_tax_deductible: det.latestExpense.is_tax_deductible,
      status: "active",
    });
    setDismissed((prev) => new Set([...prev, normalizeVendor(det.vendor)]));
  };

  const handleDismiss = (vendor: string) => {
    setDismissed((prev) => new Set([...prev, normalizeVendor(vendor)]));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-500/30 bg-amber-500/5 mb-4">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-500/5 rounded-t-lg transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm text-foreground">
              {visible.length} Potential Subscription{visible.length !== 1 ? "s" : ""} Detected
            </span>
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">
              Auto-detected
            </Badge>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              We analyzed your expenses and found recurring patterns. Convert them to subscriptions for better tracking.
            </p>

            {visible.map((det) => {
              const conf = CONFIDENCE_STYLES[det.confidence];
              const ConfIcon = conf.icon;
              const cat = det.categoryId ? catMap.get(det.categoryId) : null;
              const isExpanded = expanded === det.vendor;

              return (
                <div
                  key={det.vendor}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : det.vendor)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{det.vendor}</span>
                          <Badge variant="outline" className={`text-[10px] ${conf.bg}`}>
                            <ConfIcon className="h-3 w-3 mr-0.5" />
                            {conf.label}
                          </Badge>
                          {cat && (
                            <Badge variant="outline" className="text-[10px]" style={{ borderColor: cat.color, color: cat.color }}>
                              {cat.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ~${det.avgAmount.toFixed(2)}/{det.billingCycle} · {det.occurrences} transactions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleConvert(det)}
                        disabled={createSub.isPending}
                      >
                        <Plus className="h-3 w-3" /> Track
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDismiss(det.vendor)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pl-7 space-y-1.5">
                      {det.reasons.map((reason, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                          {reason}
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground mt-1">
                        Months: {det.months.sort().join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

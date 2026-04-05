import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, Trash2, ExternalLink, AlertTriangle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useRecurringSubscriptions,
  useDeleteSubscription,
  useUpdateSubscription,
  type ExpenseCategory,
} from "@/hooks/use-expenses";
import { AddSubscriptionDialog } from "./AddSubscriptionDialog";
import { DetectedSubscriptions } from "./DetectedSubscriptions";

interface Props {
  categories: ExpenseCategory[];
}

export function SubscriptionsList({ categories }: Props) {
  const { data: subs = [], isLoading } = useRecurringSubscriptions();
  const deleteSub = useDeleteSubscription();
  const updateSub = useUpdateSubscription();
  const [showAdd, setShowAdd] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const activeSubs = subs.filter((s) => s.status === "active");
  const monthlyTotal = useMemo(() => {
    return activeSubs.reduce((sum, s) => {
      const amt = Number(s.amount);
      if (s.billing_cycle === "yearly") return sum + amt / 12;
      if (s.billing_cycle === "quarterly") return sum + amt / 3;
      return sum + amt;
    }, 0);
  }, [activeSubs]);

  const toggleStatus = (sub: (typeof subs)[0]) => {
    updateSub.mutate({
      id: sub.id,
      status: sub.status === "active" ? "paused" : "active",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">Monthly Cost</p>
            <p className="text-xl font-mono font-bold">${monthlyTotal.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">Yearly Cost</p>
            <p className="text-xl font-mono font-bold">${(monthlyTotal * 12).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold">{activeSubs.length}</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Subscription
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : subs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No subscriptions yet. Add your first one to track recurring costs.
                </TableCell>
              </TableRow>
            ) : (
              subs.map((sub) => {
                const cat = sub.category_id ? catMap.get(sub.category_id) : null;
                const daysUntilDue = sub.next_billing_date
                  ? differenceInDays(new Date(sub.next_billing_date), new Date())
                  : null;
                const dueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

                return (
                  <TableRow key={sub.id} className={sub.status !== "active" ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sub.name}</span>
                        {sub.url && (
                          <a href={sub.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <Badge variant="outline" className="text-xs" style={{ borderColor: cat.color, color: cat.color }}>
                          {cat.name}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{sub.billing_cycle}</TableCell>
                    <TableCell>
                      {sub.next_billing_date ? (
                        <div className="flex items-center gap-1.5">
                          {dueSoon && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          <span className={`text-sm ${dueSoon ? "text-amber-600 font-medium" : ""}`}>
                            {format(new Date(sub.next_billing_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      ${Number(sub.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "active" ? "default" : sub.status === "paused" ? "secondary" : "outline"} className="text-xs capitalize">
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(sub)}>
                          {sub.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteSub.mutate(sub.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AddSubscriptionDialog open={showAdd} onOpenChange={setShowAdd} categories={categories} />
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, DollarSign, Database, Wifi } from "lucide-react";
import { format, subMonths, startOfMonth, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManualEntry {
  id: string;
  workspace_id: string;
  month: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

interface MonthRow {
  month: string; // YYYY-MM
  label: string; // "Jan 25"
  apiRevenue: number | null;
  manualRevenue: number | null;
  manualEntry: ManualEntry | null;
  source: "api" | "manual" | "none";
  total: number;
}

const fmtDollar = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AdSenseTab() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ManualEntry | null>(null);
  const [formMonth, setFormMonth] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Fetch API AdSense data
  const { data: apiData = [] } = useQuery({
    queryKey: ["adsense-api-data", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("date, estimated_revenue")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { date: string; estimated_revenue: number }[];
    },
    enabled: !!workspaceId,
  });

  // Fetch manual entries
  const { data: manualEntries = [] } = useQuery({
    queryKey: ["manual-adsense", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_adsense_revenue" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ManualEntry[];
    },
    enabled: !!workspaceId,
  });

  // Build monthly view: last 24 months
  const months = useMemo((): MonthRow[] => {
    // Aggregate API data by month
    const apiByMonth = new Map<string, number>();
    for (const row of apiData) {
      const monthStr = row.date?.substring(0, 7); // YYYY-MM
      if (!monthStr) continue;
      apiByMonth.set(monthStr, (apiByMonth.get(monthStr) || 0) + (Number(row.estimated_revenue) || 0));
    }

    // Manual entries by month
    const manualByMonth = new Map<string, ManualEntry>();
    for (const entry of manualEntries) {
      manualByMonth.set(entry.month, entry);
    }

    // Collect all months: last 24 + any manual entries outside that range
    const allMonths = new Set<string>();
    for (let i = 0; i < 24; i++) {
      const d = startOfMonth(subMonths(new Date(), i));
      allMonths.add(format(d, "yyyy-MM"));
    }
    for (const entry of manualEntries) {
      allMonths.add(entry.month);
    }

    const sorted = Array.from(allMonths).sort().reverse();

    return sorted.map((m) => {
      const apiRev = apiByMonth.get(m) ?? null;
      const manual = manualByMonth.get(m) ?? null;
      const hasApi = apiRev !== null && apiRev > 0;
      const hasManual = manual !== null;

      return {
        month: m,
        label: format(parse(m, "yyyy-MM", new Date()), "MMM yyyy"),
        apiRevenue: hasApi ? Math.round(apiRev * 100) / 100 : null,
        manualRevenue: hasManual ? manual.amount : null,
        manualEntry: manual,
        source: hasApi ? "api" : hasManual ? "manual" : "none",
        total: hasApi ? Math.round(apiRev * 100) / 100 : hasManual ? manual.amount : 0,
      };
    });
  }, [apiData, manualEntries]);

  // Available months for add form (no API data AND no manual entry yet)
  const availableMonths = useMemo(() => {
    return months.filter((m) => m.apiRevenue === null && m.manualEntry === null);
  }, [months]);

  const totalRevenue = useMemo(() => months.reduce((s, m) => s + m.total, 0), [months]);

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("manual_adsense_revenue" as any)
        .insert({
          workspace_id: workspaceId!,
          month: formMonth,
          amount: parseFloat(formAmount),
          notes: formNotes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-adsense"] });
      queryClient.invalidateQueries({ queryKey: ["unified-rev-adsense"] });
      toast({ title: "Success", description: "AdSense revenue added" });
      resetForm();
      setShowAddDialog(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingEntry) return;
      const { error } = await supabase
        .from("manual_adsense_revenue" as any)
        .update({
          amount: parseFloat(formAmount),
          notes: formNotes || null,
        })
        .eq("id", editingEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-adsense"] });
      queryClient.invalidateQueries({ queryKey: ["unified-rev-adsense"] });
      toast({ title: "Success", description: "AdSense revenue updated" });
      resetForm();
      setEditingEntry(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manual_adsense_revenue" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-adsense"] });
      queryClient.invalidateQueries({ queryKey: ["unified-rev-adsense"] });
      toast({ title: "Deleted", description: "Manual entry removed" });
      setDeletingEntry(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormMonth("");
    setFormAmount("");
    setFormNotes("");
  }

  function openEdit(entry: ManualEntry) {
    setEditingEntry(entry);
    setFormAmount(entry.amount.toString());
    setFormNotes(entry.notes || "");
  }

  function openAdd() {
    resetForm();
    if (availableMonths.length > 0) {
      setFormMonth(availableMonths[0].month);
    }
    setShowAddDialog(true);
  }

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total AdSense Revenue</p>
              <p className="text-xl font-bold font-mono text-foreground">{fmtDollar(totalRevenue)}</p>
            </div>
          </div>
          <Button size="sm" onClick={openAdd} disabled={availableMonths.length === 0}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Month
          </Button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                <TableCell>
                  {row.source === "api" ? (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Wifi className="w-3 h-3" />
                      API
                    </Badge>
                  ) : row.source === "manual" ? (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Database className="w-3 h-3" />
                      Manual
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {row.total > 0 ? fmtDollar(row.total) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {row.manualEntry?.notes || ""}
                </TableCell>
                <TableCell className="text-right">
                  {row.source === "manual" && row.manualEntry && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(row.manualEntry!)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingEntry(row.manualEntry!)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  {row.source === "none" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        resetForm();
                        setFormMonth(row.month);
                        setShowAddDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {months.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No AdSense data available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add AdSense Revenue</DialogTitle>
            <DialogDescription>Add revenue for a month without API data.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Month</Label>
              <Select value={formMonth} onValueChange={setFormMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m.month} value={m.month}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Revenue Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. From AdSense dashboard export"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!formMonth || !formAmount || parseFloat(formAmount) <= 0 || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add Revenue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit AdSense Revenue</DialogTitle>
            <DialogDescription>
              Update revenue for {editingEntry ? format(parse(editingEntry.month, "yyyy-MM", new Date()), "MMM yyyy") : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Revenue Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. From AdSense dashboard export"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!formAmount || parseFloat(formAmount) <= 0 || editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Remove manual AdSense revenue for {deletingEntry ? format(parse(deletingEntry.month, "yyyy-MM", new Date()), "MMM yyyy") : ""}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { X, Trash2, UserCheck, Tag } from "lucide-react";
import { useState } from "react";
import { useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import { useToast } from "@/hooks/use-toast";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  entityType: "contact" | "company";
}

export function BulkActionsBar({ selectedCount, selectedIds, onClearSelection, entityType }: BulkActionsBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [vipValue, setVipValue] = useState("");
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const { toast } = useToast();

  if (selectedCount === 0) return null;

  const handleBulkStatusChange = async (status: string) => {
    if (entityType !== "contact") return;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await updateContact.mutateAsync({ id, status });
        successCount++;
      } catch {
        // continue
      }
    }
    toast({ title: `Updated ${successCount} contact${successCount !== 1 ? "s" : ""}` });
    setStatusValue("");
    onClearSelection();
  };

  const handleBulkVipChange = async (vipTier: string) => {
    if (entityType !== "contact") return;
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await updateContact.mutateAsync({ id, vip_tier: vipTier });
        successCount++;
      } catch {
        // continue
      }
    }
    toast({ title: `Updated ${successCount} contact${successCount !== 1 ? "s" : ""}` });
    setVipValue("");
    onClearSelection();
  };

  const handleBulkDelete = async () => {
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await deleteContact.mutateAsync(id);
        successCount++;
      } catch {
        // continue
      }
    }
    toast({ title: `Deleted ${successCount} ${entityType}${successCount !== 1 ? "s" : ""}` });
    setDeleteOpen(false);
    onClearSelection();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-bottom-2">
        <Badge variant="secondary" className="text-xs font-medium">
          {selectedCount} selected
        </Badge>

        {entityType === "contact" && (
          <>
            <Select value={statusValue} onValueChange={handleBulkStatusChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-card border-border">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vipValue} onValueChange={handleBulkVipChange}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-card border-border">
                <Tag className="w-3.5 h-3.5 mr-1" />
                <SelectValue placeholder="Set VIP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <Button variant="destructive" size="sm" className="h-8 text-xs gap-1" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>

        <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto gap-1" onClick={onClearSelection}>
          <X className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} {entityType}{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected {entityType}s will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

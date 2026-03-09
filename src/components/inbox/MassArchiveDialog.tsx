import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArchiveIcon, Loader2Icon } from "lucide-react";
import { useMoveEmail } from "@/hooks/use-smart-inbox";
import type { SmartEmail } from "@/hooks/use-smart-inbox";
import { toast } from "sonner";

interface MassArchiveDialogProps {
  emails: SmartEmail[];
}

export function MassArchiveDialog({ emails }: MassArchiveDialogProps) {
  const moveEmail = useMoveEmail();
  const [criteria, setCriteria] = useState("older-7");
  const [open, setOpen] = useState(false);

  const getMatchingEmails = () => {
    const now = Date.now();
    switch (criteria) {
      case "older-3":
        return emails.filter((e) => e.is_read && now - new Date(e.received_at).getTime() > 3 * 24 * 60 * 60 * 1000);
      case "older-7":
        return emails.filter((e) => e.is_read && now - new Date(e.received_at).getTime() > 7 * 24 * 60 * 60 * 1000);
      case "older-30":
        return emails.filter((e) => e.is_read && now - new Date(e.received_at).getTime() > 30 * 24 * 60 * 60 * 1000);
      case "p4-read":
        return emails.filter((e) => e.is_read && e.priority === "P4");
      case "all-read":
        return emails.filter((e) => e.is_read);
      default:
        return [];
    }
  };

  const matching = getMatchingEmails();

  const handleArchive = () => {
    if (matching.length === 0) return;
    moveEmail.mutate({ ids: matching.map((e) => e.id), folder: "archive" }, {
      onSuccess: () => {
        toast.success(`Archived ${matching.length} emails. Inbox Zero! 🎉`);
        setOpen(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <ArchiveIcon className="h-3.5 w-3.5" />
          Mass Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mass Archive</AlertDialogTitle>
          <AlertDialogDescription>
            Archive multiple read emails at once to reach Inbox Zero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-3 space-y-3">
          <Select value={criteria} onValueChange={setCriteria}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="older-3">Read emails older than 3 days</SelectItem>
              <SelectItem value="older-7">Read emails older than 7 days</SelectItem>
              <SelectItem value="older-30">Read emails older than 30 days</SelectItem>
              <SelectItem value="p4-read">All read P4 (unknown sender) emails</SelectItem>
              <SelectItem value="all-read">All read emails</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{matching.length}</strong> emails match this criteria
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={matching.length === 0 || moveEmail.isPending}>
            {moveEmail.isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
            Archive {matching.length} emails
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

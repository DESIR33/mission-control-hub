import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import type { AiProposal } from "@/types/proposals";

interface EditProposalDialogProps {
  proposal: AiProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndApprove: (
    id: string,
    changes: Record<string, unknown>,
    summary: string
  ) => void;
  isLoading?: boolean;
}

export function EditProposalDialog({
  proposal,
  open,
  onOpenChange,
  onSaveAndApprove,
  isLoading,
}: EditProposalDialogProps) {
  const [changesText, setChangesText] = useState("");
  const [summary, setSummary] = useState("");

  // Reset state when proposal changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && proposal) {
      setChangesText(JSON.stringify(proposal.proposed_changes, null, 2));
      setSummary(proposal.summary ?? "");
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!proposal) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(changesText);
    } catch {
      return; // Don't save if JSON is invalid
    }

    onSaveAndApprove(proposal.id, parsed, summary);
  };

  let isValidJson = true;
  try {
    JSON.parse(changesText);
  } catch {
    isValidJson = false;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit & Approve Proposal</DialogTitle>
        </DialogHeader>

        {proposal && (
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {proposal.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {proposal.entity_type}: {proposal.entity_name ?? proposal.entity_id}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="changes">Proposed Changes (JSON)</Label>
                {!isValidJson && changesText.length > 0 && (
                  <span className="text-xs text-destructive">
                    Invalid JSON
                  </span>
                )}
              </div>
              <Textarea
                id="changes"
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                rows={12}
                className={`bg-card font-mono text-xs ${!isValidJson && changesText.length > 0 ? "border-destructive" : ""}`}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidJson || isLoading}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {isLoading ? "Saving..." : "Save & Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Pencil,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Handshake,
  Sparkles,
  Mail,
  TrendingUp,
  Tag,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { AiProposal } from "@/types/proposals";

const statusConfig: Record<
  AiProposal["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending Review",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  approved: {
    label: "Approved",
    className: "bg-success/15 text-success border-success/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

const entityTypeConfig: Record<
  AiProposal["entity_type"],
  { icon: typeof User; label: string }
> = {
  contact: { icon: User, label: "Contact" },
  company: { icon: Building2, label: "Company" },
  deal: { icon: Handshake, label: "Deal" },
};

const proposalTypeConfig: Record<
  AiProposal["proposal_type"],
  { icon: typeof Sparkles; label: string; className: string }
> = {
  enrichment: {
    icon: Sparkles,
    label: "Enrichment",
    className: "bg-primary/10 text-primary",
  },
  outreach: {
    icon: Mail,
    label: "Outreach",
    className: "bg-chart-4/10 text-chart-4",
  },
  deal_update: {
    icon: TrendingUp,
    label: "Deal Update",
    className: "bg-success/10 text-success",
  },
  score_update: {
    icon: Target,
    label: "Score Update",
    className: "bg-warning/10 text-warning",
  },
  tag_suggestion: {
    icon: Tag,
    label: "Tag Suggestion",
    className: "bg-chart-5/10 text-chart-5",
  },
};

interface ProposalCardProps {
  proposal: AiProposal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (proposal: AiProposal) => void;
  isActioning?: boolean;
}

export function ProposalCard({
  proposal,
  onApprove,
  onReject,
  onEdit,
  isActioning,
}: ProposalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const status = statusConfig[proposal.status];
  const entityType = entityTypeConfig[proposal.entity_type];
  const proposalType = proposalTypeConfig[proposal.proposal_type];
  const EntityIcon = entityType.icon;
  const TypeIcon = proposalType.icon;

  const confidencePercent = proposal.confidence
    ? Math.round(proposal.confidence * 100)
    : null;

  return (
    <Card
      className={cn(
        "p-5 transition-all",
        proposal.status === "pending"
          ? "border-border bg-card"
          : "border-border/50 bg-card/60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              proposalType.className
            )}
          >
            <TypeIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {proposal.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <EntityIcon className="w-3 h-3" />
                <span>
                  {entityType.label}:{" "}
                  <span className="text-foreground font-medium">
                    {proposal.entity_name ?? proposal.entity_id.slice(0, 8)}
                  </span>
                </span>
              </div>
              <span className="text-muted-foreground/40">|</span>
              <Badge
                variant="outline"
                className={cn("text-[10px]", proposalType.className)}
              >
                {proposalType.label}
              </Badge>
              {confidencePercent !== null && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      confidencePercent >= 85
                        ? "text-success"
                        : confidencePercent >= 70
                          ? "text-warning"
                          : "text-muted-foreground"
                    )}
                  >
                    {confidencePercent}% confidence
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-[10px] uppercase tracking-wider", status.className)}
          >
            {status.label}
          </Badge>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(proposal.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {/* Summary */}
      {proposal.summary && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {proposal.summary}
        </p>
      )}

      {/* Expandable changes */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        {expanded ? "Hide" : "View"} proposed changes
      </button>

      {expanded && (
        <div className="mt-3 rounded-md bg-muted/50 p-3 overflow-x-auto">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(proposal.proposed_changes, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {proposal.status === "pending" && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Button
            size="sm"
            onClick={() => onApprove(proposal.id)}
            disabled={isActioning}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(proposal.id)}
            disabled={isActioning}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(proposal)}
            disabled={isActioning}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit & Approve
          </Button>
        </div>
      )}

      {/* Reviewed info */}
      {proposal.status !== "pending" && proposal.reviewed_at && (
        <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
          {proposal.status === "approved" ? "Approved" : "Rejected"}{" "}
          {formatDistanceToNow(new Date(proposal.reviewed_at), {
            addSuffix: true,
          })}
        </p>
      )}
    </Card>
  );
}

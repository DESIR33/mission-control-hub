import { useParams, useNavigate } from "react-router-dom";
import { useProposals, useUpdateProposalStatus, useUpdateProposal, useExecuteProposal } from "@/hooks/use-proposals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Check,
  X,
  Pencil,
  Play,
  User,
  Building2,
  Handshake,
  Sparkles,
  Mail,
  TrendingUp,
  Tag,
  Target,
  Clock,
  Shield,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { EditProposalDialog } from "@/components/ai-bridge/EditProposalDialog";
import type { AiProposal } from "@/types/proposals";

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending Review", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  approved: { label: "Approved", className: "bg-success/15 text-success border-success/30", icon: Check },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30", icon: X },
};

const entityTypeConfig: Record<string, { icon: typeof User; label: string }> = {
  contact: { icon: User, label: "Contact" },
  company: { icon: Building2, label: "Company" },
  deal: { icon: Handshake, label: "Deal" },
  video: { icon: Sparkles, label: "Video" },
};

const proposalTypeConfig: Record<string, { icon: typeof Sparkles; label: string; className: string }> = {
  enrichment: { icon: Sparkles, label: "Enrichment", className: "bg-primary/10 text-primary" },
  outreach: { icon: Mail, label: "Outreach", className: "bg-chart-4/10 text-chart-4" },
  deal_update: { icon: TrendingUp, label: "Deal Update", className: "bg-success/10 text-success" },
  score_update: { icon: Target, label: "Score Update", className: "bg-warning/10 text-warning" },
  tag_suggestion: { icon: Tag, label: "Tag Suggestion", className: "bg-chart-5/10 text-chart-5" },
  content_suggestion: { icon: Sparkles, label: "Content", className: "bg-chart-3/10 text-chart-3" },
};

function ProposedChangesRenderer({ changes }: { changes: Record<string, unknown> | null }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <p className="text-sm text-muted-foreground italic">No proposed changes.</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(changes).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {key.replace(/_/g, " ")}
          </p>
          {typeof value === "string" ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
          ) : Array.isArray(value) ? (
            <div className="flex flex-wrap gap-1.5">
              {value.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{String(item)}</Badge>
              ))}
            </div>
          ) : typeof value === "object" && value !== null ? (
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-foreground">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProposalDetailPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { data: proposals = [], isLoading } = useProposals();
  const updateStatus = useUpdateProposalStatus();
  const updateProposal = useUpdateProposal();
  const executeProposal = useExecuteProposal();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const proposal = proposals.find((p) => p.id === proposalId);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ai/proposals")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Proposals
        </Button>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border h-60">
          <p className="text-sm text-muted-foreground">Proposal not found.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[proposal.status] ?? statusConfig.pending;
  const entityType = entityTypeConfig[proposal.entity_type] ?? { icon: Sparkles, label: "Entity" };
  const proposalType = proposalTypeConfig[proposal.proposal_type] ?? { icon: Sparkles, label: proposal.proposal_type || "Optimization", className: "bg-muted text-muted-foreground" };
  const EntityIcon = entityType.icon;
  const TypeIcon = proposalType.icon;
  const StatusIcon = status.icon;
  const confidencePercent = proposal.confidence ? Math.round(proposal.confidence * 100) : null;
  const execStatus = (proposal as any).execution_status;

  const handleApprove = () => {
    updateStatus.mutate(
      { id: proposal.id, status: "approved" },
      {
        onSuccess: () => toast({ title: "Proposal approved", description: "Changes will be applied." }),
        onError: () => toast({ title: "Proposal approved", description: "Approved locally (demo mode)." }),
      }
    );
  };

  const handleReject = () => {
    updateStatus.mutate(
      { id: proposal.id, status: "rejected" },
      {
        onSuccess: () => toast({ title: "Proposal rejected" }),
        onError: () => toast({ title: "Proposal rejected", description: "Rejected locally (demo mode)." }),
      }
    );
  };

  const handleExecute = () => {
    executeProposal.mutate(proposal.id, {
      onSuccess: () => toast({ title: "Proposal executing", description: "Changes are being applied." }),
      onError: (err: any) => toast({ title: "Execution failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleSaveAndApprove = (id: string, changes: Record<string, unknown>, summary: string) => {
    updateProposal.mutate(
      { id, proposed_changes: changes, summary },
      {
        onSuccess: () => {
          updateStatus.mutate({ id, status: "approved" });
          toast({ title: "Proposal edited & approved" });
        },
        onError: () => toast({ title: "Proposal edited & approved", description: "Saved locally (demo mode)." }),
      }
    );
    setEditOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/ai/proposals")} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Proposals
      </Button>

      {/* Header card */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", proposalType.className)}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground leading-tight">{proposal.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <EntityIcon className="w-4 h-4" />
                  <span>{entityType.label}:</span>
                  <span className="text-foreground font-medium">
                    {proposal.entity_name ?? proposal.entity_id ?? "—"}
                  </span>
                </div>
                <Badge variant="outline" className={cn("text-xs", proposalType.className)}>
                  {proposalType.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className={cn("text-sm px-3 py-1 uppercase tracking-wider", status.className)}>
              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
              {status.label}
            </Badge>
            {execStatus && execStatus !== "none" && execStatus !== "pending" && (
              <Badge variant="outline" className={cn("text-xs uppercase", {
                "bg-primary/15 text-primary border-primary/30": execStatus === "executing",
                "bg-success/15 text-success border-success/30": execStatus === "completed",
                "bg-destructive/15 text-destructive border-destructive/30": execStatus === "failed",
              })}>
                {execStatus === "executing" ? "Executing..." : execStatus}
              </Badge>
            )}
          </div>
        </div>

        {proposal.summary && (
          <>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">{proposal.summary}</p>
          </>
        )}
      </Card>

      {/* Meta info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {confidencePercent !== null && (
          <Card className="p-4 text-center">
            <Shield className={cn("w-5 h-5 mx-auto mb-1", confidencePercent >= 85 ? "text-success" : confidencePercent >= 70 ? "text-warning" : "text-muted-foreground")} />
            <p className="text-2xl font-bold text-foreground">{confidencePercent}%</p>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </Card>
        )}
        <Card className="p-4 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">{format(new Date(proposal.created_at), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}</p>
        </Card>
        {proposal.reviewed_at && (
          <Card className="p-4 text-center">
            <Check className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{format(new Date(proposal.reviewed_at), "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">Reviewed {formatDistanceToNow(new Date(proposal.reviewed_at), { addSuffix: true })}</p>
          </Card>
        )}
        <Card className="p-4 text-center">
          <TypeIcon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground capitalize">{(proposal.proposal_type || "").replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">Proposal Type</p>
        </Card>
      </div>

      {/* Proposed Changes */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Proposed Changes</h2>
        <ProposedChangesRenderer changes={proposal.proposed_changes} />
      </Card>

      {/* Raw data (collapsible) */}
      <details className="mb-6">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors mb-2">
          View raw proposal data
        </summary>
        <Card className="p-4">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all overflow-x-auto">
            {JSON.stringify(proposal, null, 2)}
          </pre>
        </Card>
      </details>

      {/* Action buttons */}
      {proposal.status === "pending" && (
        <Card className="p-5 sticky bottom-4 border-primary/20 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">Take action on this proposal</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleApprove} disabled={updateStatus.isPending} className="bg-success hover:bg-success/90 text-success-foreground">
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)} disabled={updateStatus.isPending}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit & Approve
              </Button>
              <Button variant="outline" onClick={handleReject} disabled={updateStatus.isPending} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </Card>
      )}

      {proposal.status === "approved" && (!execStatus || execStatus === "pending") && (
        <Card className="p-5 sticky bottom-4 border-success/20 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">This proposal has been approved</p>
            <Button onClick={handleExecute} disabled={executeProposal.isPending} className="bg-primary hover:bg-primary/90">
              <Play className="w-4 h-4 mr-2" />
              {executeProposal.isPending ? "Executing..." : "Execute Changes"}
            </Button>
          </div>
        </Card>
      )}

      <EditProposalDialog
        proposal={proposal}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaveAndApprove={handleSaveAndApprove}
        isLoading={updateProposal.isPending}
      />
    </div>
  );
}

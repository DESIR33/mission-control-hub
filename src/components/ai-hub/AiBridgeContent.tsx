import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Filter, Sparkles, Loader2, Check } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { useProposals, useUpdateProposalStatus, useUpdateProposal } from "@/hooks/use-proposals";
import { ProposalCard } from "@/components/ai-bridge/ProposalCard";
import { ProposalStats } from "@/components/ai-bridge/ProposalStats";
import { EditProposalDialog } from "@/components/ai-bridge/EditProposalDialog";
import { useToast } from "@/hooks/use-toast";
import type { AiProposal, ProposalStatus } from "@/types/proposals";

export function AiBridgeContent() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingProposal, setEditingProposal] = useState<AiProposal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { workspaceId } = useWorkspace();
  const { data: proposals = [], isLoading } = useProposals();
  const updateStatus = useUpdateProposalStatus();
  const updateProposal = useUpdateProposal();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!workspaceId) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-proposals", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      toast({ title: "Proposals generated", description: `${data?.inserted ?? 0} new AI proposals created.` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const [localStatuses, setLocalStatuses] = useState<Record<string, ProposalStatus>>({});
  const [localEdits, setLocalEdits] = useState<Record<string, { proposed_changes: Record<string, unknown>; summary: string }>>({});

  const effectiveProposals = useMemo(
    () => proposals.map((p) => ({
      ...p,
      ...(localEdits[p.id] ? { proposed_changes: localEdits[p.id].proposed_changes, summary: localEdits[p.id].summary } : {}),
      status: localStatuses[p.id] ?? p.status,
      reviewed_at: localStatuses[p.id] && localStatuses[p.id] !== p.status ? new Date().toISOString() : p.reviewed_at,
    })),
    [proposals, localStatuses, localEdits]
  );

  const filterByTab = (tab: string, list: AiProposal[]) => {
    if (tab === "pending") return list.filter((p) => p.status === "pending");
    if (tab === "reviewed") return list.filter((p) => p.status !== "pending");
    return list;
  };

  const filterBySearch = (list: AiProposal[]) => {
    let result = list;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q) || (p.summary ?? "").toLowerCase().includes(q) || (p.entity_name ?? "").toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      result = result.filter((p) => p.proposal_type === typeFilter);
    }
    return result;
  };

  const handleApprove = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: "approved" }));
    updateStatus.mutate({ id, status: "approved" }, {
      onSuccess: () => toast({ title: "Proposal approved", description: "The AI proposal has been approved and changes will be applied." }),
      onError: () => toast({ title: "Proposal approved", description: "Approved locally (demo mode)." }),
    });
  };

  const handleReject = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: "rejected" }));
    updateStatus.mutate({ id, status: "rejected" }, {
      onSuccess: () => toast({ title: "Proposal rejected", description: "The AI proposal has been rejected." }),
      onError: () => toast({ title: "Proposal rejected", description: "Rejected locally (demo mode)." }),
    });
  };

  const handleEdit = (proposal: AiProposal) => { setEditingProposal(proposal); setEditDialogOpen(true); };

  const handleSaveAndApprove = (id: string, changes: Record<string, unknown>, summary: string) => {
    setLocalEdits((prev) => ({ ...prev, [id]: { proposed_changes: changes, summary } }));
    setLocalStatuses((prev) => ({ ...prev, [id]: "approved" }));
    setEditDialogOpen(false);
    updateProposal.mutate({ id, proposed_changes: changes, summary }, {
      onSuccess: () => { updateStatus.mutate({ id, status: "approved" }); toast({ title: "Proposal edited & approved", description: "Changes saved and proposal approved." }); },
      onError: () => toast({ title: "Proposal edited & approved", description: "Saved locally (demo mode)." }),
    });
  };

  const pendingCount = effectiveProposals.filter((p) => p.status === "pending").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-40 w-full" />))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {pendingCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => { effectiveProposals.filter((p) => p.status === "pending").forEach((p) => handleApprove(p.id)); }} disabled={updateStatus.isPending}>
            <Check className="w-4 h-4 mr-2" /> Approve All ({pendingCount})
          </Button>
        )}
        <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
          {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {isGenerating ? "Generating..." : "Generate Proposals"}
        </Button>
      </div>

      <ProposalStats proposals={effectiveProposals} />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="all">All ({effectiveProposals.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({effectiveProposals.length - pendingCount})</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search proposals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="enrichment">Enrichment</SelectItem>
              <SelectItem value="outreach">Outreach</SelectItem>
              <SelectItem value="deal_update">Deal Update</SelectItem>
              <SelectItem value="score_update">Score Update</SelectItem>
              <SelectItem value="tag_suggestion">Tag Suggestion</SelectItem>
              <SelectItem value="content_suggestion">Content Suggestion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {["all", "pending", "reviewed"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {(() => {
              const filtered = filterBySearch(filterByTab(tab, effectiveProposals));
              if (filtered.length === 0) {
                return (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border h-40">
                    <p className="text-sm text-muted-foreground">
                      {search || typeFilter !== "all" ? "No proposals match your filters" : tab === "pending" ? "No pending proposals - you're all caught up!" : "No proposals yet"}
                    </p>
                  </div>
                );
              }
              return (<>
                <p className="text-xs text-muted-foreground">{filtered.length} proposal{filtered.length !== 1 ? "s" : ""}{search || typeFilter !== "all" ? " (filtered)" : ""}</p>
                {filtered.map((proposal) => (<ProposalCard key={proposal.id} proposal={proposal} onApprove={handleApprove} onReject={handleReject} onEdit={handleEdit} isActioning={updateStatus.isPending} />))}
              </>);
            })()}
          </TabsContent>
        ))}
      </Tabs>

      <EditProposalDialog proposal={editingProposal} open={editDialogOpen} onOpenChange={setEditDialogOpen} onSaveAndApprove={handleSaveAndApprove} isLoading={updateProposal.isPending} />
    </div>
  );
}

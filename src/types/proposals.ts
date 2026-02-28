export type ProposalStatus = "pending" | "approved" | "rejected";
export type ProposalEntityType = "contact" | "deal" | "company";
export type ProposalType =
  | "enrichment"
  | "outreach"
  | "deal_update"
  | "score_update"
  | "tag_suggestion"
  | "content_suggestion";

export interface AiProposal {
  id: string;
  workspace_id: string;
  entity_type: ProposalEntityType;
  entity_id: string;
  proposal_type: ProposalType;
  title: string;
  summary: string | null;
  proposed_changes: Record<string, unknown>;
  status: ProposalStatus;
  confidence: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  entity_name?: string;
}

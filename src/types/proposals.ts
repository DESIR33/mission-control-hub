export type ProposalStatus = "pending" | "approved" | "rejected";
export type ProposalEntityType = "contact" | "deal" | "company" | "video";
export type ProposalType =
  | "enrichment"
  | "outreach"
  | "deal_update"
  | "score_update"
  | "tag_suggestion"
  | "content_suggestion"
  | "video_title_optimization"
  | "video_description_optimization"
  | "video_thumbnail_optimization"
  | "video_tags_optimization";

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
  video_id?: string | null;
  execution_status?: string | null;
  metadata?: Record<string, unknown> | null;
}

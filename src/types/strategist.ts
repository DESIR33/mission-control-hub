export interface VideoOptimizationExperiment {
  id: string;
  workspace_id: string;
  video_id: string;
  video_title: string;
  experiment_type: "title" | "description" | "tags" | "thumbnail" | "multi";
  original_title: string | null;
  original_description: string | null;
  original_tags: string[] | null;
  original_thumbnail_url: string | null;
  new_title: string | null;
  new_description: string | null;
  new_tags: string[] | null;
  new_thumbnail_url: string | null;
  baseline_views: number;
  baseline_ctr: number;
  baseline_impressions: number;
  baseline_avg_view_duration: number;
  baseline_watch_time_hours: number;
  result_views: number | null;
  result_ctr: number | null;
  result_impressions: number | null;
  result_avg_view_duration: number | null;
  result_watch_time_hours: number | null;
  status: "active" | "completed" | "rolled_back";
  proposal_id: string | null;
  started_at: string;
  measurement_period_days: number;
  measured_at: string | null;
  completed_at: string | null;
  rolled_back_at: string | null;
  rollback_reason: string | null;
  performance_delta: Record<string, number> | null;
  lesson_learned: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategistDailyRun {
  id: string;
  workspace_id: string;
  run_date: string;
  execution_id: string | null;
  recommendations_count: number;
  proposal_ids: string[];
  status: "pending" | "running" | "completed" | "failed";
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StrategistNotification {
  id: string;
  workspace_id: string;
  run_id: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface VideoOptimizationProposal {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  proposal_type:
    | "video_title_optimization"
    | "video_description_optimization"
    | "video_tags_optimization"
    | "video_thumbnail_optimization";
  title: string;
  summary: string | null;
  proposed_changes: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  confidence: number;
  video_id: string | null;
  optimization_proof: {
    current_metrics?: {
      views_30d: number;
      ctr: number;
      impressions: number;
      percentile: number;
    };
    channel_average?: {
      views_30d: number;
      ctr: number;
    };
    competitor_comparison?: string;
    youtube_best_practices?: string;
    expected_impact?: string;
  } | null;
  thumbnail_prompts: string[] | null;
  thumbnail_urls: string[] | null;
  requires_thumbnail_generation: boolean;
  execution_status: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OptimizationType = "title" | "description" | "tags" | "thumbnail";

export const OPTIMIZATION_TYPE_LABELS: Record<string, string> = {
  video_title_optimization: "Title Optimization",
  video_description_optimization: "Description Optimization",
  video_tags_optimization: "Tags Optimization",
  video_thumbnail_optimization: "Thumbnail Optimization",
};

export const OPTIMIZATION_TYPE_ICONS: Record<string, string> = {
  video_title_optimization: "Type",
  video_description_optimization: "FileText",
  video_tags_optimization: "Tags",
  video_thumbnail_optimization: "Image",
};

export const EXPERIMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  completed: { label: "Completed", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  rolled_back: { label: "Rolled Back", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

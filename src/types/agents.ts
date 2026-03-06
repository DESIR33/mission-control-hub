export interface AgentDefinition {
  id: string;
  workspace_id: string | null;
  name: string;
  slug: string;
  description: string;
  system_prompt: string;
  model: string;
  skills: string[];
  config: {
    schedule?: string;
    data_tables?: string[];
    [key: string]: unknown;
  };
  enabled: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentSkill {
  id: string;
  workspace_id: string | null;
  name: string;
  slug: string;
  description: string;
  input_schema: Record<string, unknown>;
  skill_type: "system" | "custom";
  tool_definitions: unknown[];
  handler_code: string | null;
  category: "competitor" | "content" | "growth" | "audience" | "revenue" | "general";
  enabled: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type AgentExecutionStatus = "pending" | "running" | "completed" | "failed";
export type AgentTriggerType = "manual" | "scheduled" | "chat";

export interface AgentExecution {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  agent_slug: string;
  skill_slug: string | null;
  trigger_type: AgentTriggerType;
  input: Record<string, unknown>;
  output: {
    response?: string;
    tools_called?: string[];
    proposals_created?: number;
  } | null;
  status: AgentExecutionStatus;
  proposals_created: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AgentRunResult {
  success: boolean;
  agent: string;
  agent_name: string;
  response: string;
  tools_called: string[];
  proposals_created: number;
  duration_ms: number;
  execution_id: string;
}

export interface ProactiveRunResult {
  success: boolean;
  agents_run: number;
  total_proposals_created: number;
  results: Array<{
    agent: string;
    success: boolean;
    proposals_created?: number;
    error?: string;
  }>;
}

export const AGENT_ICONS: Record<string, string> = {
  "competitor-analyst": "Swords",
  "content-strategist": "Lightbulb",
  "growth-optimizer": "TrendingUp",
  "audience-analyst": "Users",
  "revenue-optimizer": "DollarSign",
};

export const AGENT_COLORS: Record<string, string> = {
  "competitor-analyst": "text-red-400",
  "content-strategist": "text-blue-400",
  "growth-optimizer": "text-green-400",
  "audience-analyst": "text-purple-400",
  "revenue-optimizer": "text-amber-400",
};

export const CATEGORY_LABELS: Record<string, string> = {
  competitor: "Competitor",
  content: "Content",
  growth: "Growth",
  audience: "Audience",
  revenue: "Revenue",
  general: "General",
};

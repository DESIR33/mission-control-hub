export type MemoryOrigin = 'youtube' | 'crm' | 'email' | 'strategy' | 'preference' | 'manual';
export type LogSource = 'youtube' | 'crm' | 'email' | 'chat' | 'manual';
export type ServiceName = 'youtube' | 'crm' | 'email';

export interface Memory {
  id: string;
  workspace_id: string;
  content: string;
  origin: MemoryOrigin;
  tags: string[];
  created_at: string;
  updated_at: string;
  rrf_score?: number;
}

export interface DailyLog {
  id: string;
  workspace_id: string;
  log_date: string;
  source: LogSource;
  content: string;
  created_at: string;
}

export interface ServiceSnapshot {
  id: string;
  workspace_id: string;
  service: ServiceName;
  summary: string;
  raw_data: any;
  snapshot_date: string;
  created_at: string;
}

export interface ChatMessage {
  id?: string;
  session_id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    memories_used?: number;
    tools_called?: string[];
  };
  created_at: string;
}

export interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  message_count: number;
}

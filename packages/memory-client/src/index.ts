/**
 * @mch/memory-client
 * TypeScript client for the Mission Control Hub memory system.
 * Provides long-term memory for external LLMs via REST API.
 */

export interface MCHClientConfig {
  apiKey: string;
  baseUrl: string;
  agentId?: string;
  defaultVisibility?: "private" | "shared";
  defaultStrategy?: RetainStrategy;
}

export type RetainStrategy =
  | "verbatim"
  | "chunks"
  | "delta"
  | "summary"
  | "atomic_facts"
  | "append";

export interface Memory {
  id: string;
  content: string;
  origin: string;
  tags: string[];
  memory_type?: string;
  agent_id?: string;
  visibility?: string;
  rrf_score?: number;
  similarity?: number;
  created_at?: string;
}

export interface IngestOptions {
  tags?: string[];
  memory_type?: string;
  origin?: string;
  entity_type?: string;
  entity_id?: string;
  confidence?: number;
  strategy?: RetainStrategy;
  agent_id?: string;
  visibility?: "private" | "shared";
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface SearchOptions {
  origin_filter?: string;
  limit?: number;
  agent_id?: string;
}

export interface ContextBriefOptions {
  agent_id?: string;
  context?: string;
  entity_type?: string;
  entity_id?: string;
  folder_id?: string;
}

export interface IngestResult {
  ingested: number;
  duplicates: number;
  appended: number;
  errors: number;
  results: Array<{ id: string; status: string; content_preview: string }>;
}

export interface ContextBriefResult {
  sections: Array<{
    section: string;
    memories: Array<{ id: string; content: string; origin: string; score?: number }>;
  }>;
  total_memories: number;
  processing_ms: number;
}

/**
 * Mission Control Hub Memory Client
 * Provides long-term memory for any LLM or agent framework.
 */
export class MCHMemoryClient {
  private config: MCHClientConfig;

  constructor(config: MCHClientConfig) {
    this.config = config;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}/functions/v1/${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`MCH API Error (${res.status}): ${error.error || res.statusText}`);
    }

    return res.json();
  }

  /**
   * Save one or more memories to the long-term memory system.
   */
  async ingest(content: string | string[], options: IngestOptions = {}): Promise<IngestResult> {
    const memories = Array.isArray(content)
      ? content.map((c) => ({
          content: c,
          ...options,
          agent_id: options.agent_id || this.config.agentId,
          visibility: options.visibility || this.config.defaultVisibility || "shared",
          strategy: options.strategy || this.config.defaultStrategy || "verbatim",
        }))
      : [{
          content,
          ...options,
          agent_id: options.agent_id || this.config.agentId,
          visibility: options.visibility || this.config.defaultVisibility || "shared",
          strategy: options.strategy || this.config.defaultStrategy || "verbatim",
        }];

    return this.request("memory-ingest", {
      method: "POST",
      body: JSON.stringify({ memories }),
    });
  }

  /**
   * Search memories using hybrid vector + full-text search.
   */
  async search(query: string, options: SearchOptions = {}): Promise<Memory[]> {
    const res = await this.request("mcp-memory-server/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "search_memory",
          arguments: {
            query,
            origin_filter: options.origin_filter || "any",
            limit: options.limit || 10,
            agent_id: options.agent_id || this.config.agentId,
          },
        },
        id: 1,
      }),
    });
    // Parse MCP response
    return res;
  }

  /**
   * Get a curated context briefing for the current task.
   * Assembles relevant memories from multiple strategies.
   */
  async getContextBrief(options: ContextBriefOptions = {}): Promise<ContextBriefResult> {
    return this.request("memory-context-router", {
      method: "POST",
      body: JSON.stringify({
        agent_id: options.agent_id || this.config.agentId,
        context: options.context,
        entity_type: options.entity_type,
        entity_id: options.entity_id,
        folder_id: options.folder_id,
      }),
    });
  }

  /**
   * Trigger reflection to create or update a mental model.
   */
  async reflect(topic: string, options: { model_type?: string; description?: string } = {}): Promise<any> {
    return this.request("mcp-memory-server/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "reflect_memory",
          arguments: { topic, ...options },
        },
        id: 1,
      }),
    });
  }

  /**
   * Get the agent's diary entries (private + shared memories).
   */
  async getDiary(agentId?: string, limit = 20): Promise<Memory[]> {
    const id = agentId || this.config.agentId;
    if (!id) throw new Error("agent_id required for getDiary");

    return this.request("mcp-memory-server/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "get_agent_diary",
          arguments: { agent_id: id, limit },
        },
        id: 1,
      }),
    });
  }

  /**
   * Ingest a document (text content with chunking).
   */
  async ingestDocument(
    content: string,
    fileName: string,
    options: { mime_type?: string; tags?: string[]; chunk_size?: number } = {}
  ): Promise<any> {
    return this.request("document-ingest", {
      method: "POST",
      body: JSON.stringify({
        content,
        file_name: fileName,
        mime_type: options.mime_type || "text/plain",
        tags: options.tags || [],
        chunk_size: options.chunk_size || 500,
        agent_id: this.config.agentId || "global",
      }),
    });
  }

  /**
   * Query audit logs for observability.
   */
  async getAuditLog(options: {
    action_filter?: string;
    target_id?: string;
    since?: string;
    limit?: number;
  } = {}): Promise<any> {
    return this.request("memory-audit-query?action=query", {
      method: "POST",
      body: JSON.stringify(options),
    });
  }

  /**
   * Get the provenance chain for a specific memory.
   */
  async getProvenance(memoryId: string): Promise<any> {
    return this.request("memory-audit-query?action=provenance", {
      method: "POST",
      body: JSON.stringify({ memory_id: memoryId }),
    });
  }

  /**
   * Export workspace memory configuration as a template.
   */
  async exportTemplate(): Promise<any> {
    return this.request("memory-template-manager?action=export", { method: "GET" });
  }

  /**
   * Import a template into the workspace.
   */
  async importTemplate(manifest: any): Promise<any> {
    return this.request("memory-template-manager?action=import", {
      method: "POST",
      body: JSON.stringify({ manifest }),
    });
  }
}

/**
 * Create a configured MCH Memory Client.
 */
export function createMemoryClient(config: MCHClientConfig): MCHMemoryClient {
  return new MCHMemoryClient(config);
}

export default MCHMemoryClient;

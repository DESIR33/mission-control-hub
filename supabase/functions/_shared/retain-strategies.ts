/**
 * Feature 5: Retain Strategies
 * Pluggable memory extraction modes for different content types.
 */

export type RetainStrategy =
  | "verbatim"
  | "chunks"
  | "delta"
  | "summary"
  | "atomic_facts"
  | "append";

export interface ChunkOptions {
  chunk_size?: number; // tokens per chunk (default 500)
  overlap?: number; // overlap tokens (default 50)
}

export interface RetainResult {
  contents: string[];
  strategy_used: RetainStrategy;
  metadata?: Record<string, unknown>;
}

/**
 * Verbatim: Store content exactly as-is. No LLM processing.
 */
function retainVerbatim(content: string): RetainResult {
  return {
    contents: [content],
    strategy_used: "verbatim",
  };
}

/**
 * Chunks: Split content into fixed-size pieces with overlap.
 * Uses approximate word-based splitting (4 chars ~= 1 token).
 */
function retainChunks(content: string, options?: ChunkOptions): RetainResult {
  const chunkSize = options?.chunk_size || 500;
  const overlap = options?.overlap || 50;

  // Approximate token count: 1 token ≈ 4 characters
  const charsPerChunk = chunkSize * 4;
  const charsOverlap = overlap * 4;

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = start + charsPerChunk;

    // Try to break at sentence or paragraph boundary
    if (end < content.length) {
      const searchWindow = content.slice(end - 100, end + 100);
      const sentenceBreak = searchWindow.search(/[.!?]\s/);
      if (sentenceBreak > 0) {
        end = end - 100 + sentenceBreak + 2;
      }
    } else {
      end = content.length;
    }

    const chunk = content.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - charsOverlap;
    if (start >= content.length) break;
  }

  return {
    contents: chunks,
    strategy_used: "chunks",
    metadata: {
      total_chunks: chunks.length,
      chunk_size: chunkSize,
      overlap,
    },
  };
}

/**
 * Summary: Generate a single summary. Returns content for LLM summarization.
 * The caller must handle the actual LLM call.
 */
function retainSummary(content: string): RetainResult {
  // For summary, we return the original content as a single item.
  // The calling function will use LLM to summarize before storing.
  return {
    contents: [content],
    strategy_used: "summary",
    metadata: { requires_llm: true },
  };
}

/**
 * Atomic Facts: Default behavior - extract discrete facts via LLM.
 * Returns content for LLM fact extraction.
 */
function retainAtomicFacts(content: string): RetainResult {
  return {
    contents: [content],
    strategy_used: "atomic_facts",
    metadata: { requires_llm: true },
  };
}

/**
 * Apply the selected retain strategy to content.
 */
export function applyRetainStrategy(
  content: string,
  strategy: RetainStrategy,
  options?: ChunkOptions
): RetainResult {
  switch (strategy) {
    case "verbatim":
      return retainVerbatim(content);
    case "chunks":
      return retainChunks(content, options);
    case "summary":
      return retainSummary(content);
    case "atomic_facts":
      return retainAtomicFacts(content);
    case "delta":
      // Delta requires existing memories for comparison - handled by caller
      return { contents: [content], strategy_used: "delta", metadata: { requires_comparison: true } };
    case "append":
      // Append requires finding similar memory - handled by caller
      return { contents: [content], strategy_used: "append", metadata: { requires_lookup: true } };
    default:
      return retainVerbatim(content);
  }
}

/**
 * Generate the LLM prompt for summary extraction.
 */
export function getSummaryPrompt(content: string): string {
  return `Summarize the following content into a concise, information-dense paragraph that captures all key facts, decisions, and insights. Preserve specific names, numbers, and dates.

Content:
${content}

Summary:`;
}

/**
 * Generate the LLM prompt for atomic fact extraction.
 */
export function getAtomicFactsPrompt(content: string): string {
  return `Extract discrete, atomic facts from the following content. Each fact should be a single, self-contained statement that captures one piece of information. Include specific names, numbers, dates, and relationships.

Return ONLY a JSON array of strings, each being one atomic fact.

Content:
${content}

Facts:`;
}

/**
 * Generate the LLM prompt for delta extraction.
 */
export function getDeltaPrompt(content: string, existingMemories: string[]): string {
  const existingStr = existingMemories.map((m, i) => `${i + 1}. ${m}`).join("\n");
  return `Given the existing memories below, identify ONLY the genuinely new information in the new content that is NOT already captured. Return a JSON array of strings with the new facts only. If everything is already known, return an empty array [].

Existing memories:
${existingStr}

New content:
${content}

New facts only:`;
}

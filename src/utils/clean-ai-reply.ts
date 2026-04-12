/**
 * Cleans an AI response that may contain JSON formatting,
 * returning only the plain text content.
 */
export function cleanAiReply(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // Try parsing as JSON — could be a string, array, or object
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed.trim();
    if (Array.isArray(parsed)) {
      // If it's an array of strings, return the first one
      const first = parsed.find((item) => typeof item === "string" && item.trim());
      return first?.trim() || trimmed;
    }
  } catch {
    // Not JSON — that's fine
  }

  // Strip markdown code fences that wrap JSON
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    return cleanAiReply(fenceMatch[1]);
  }

  return trimmed;
}

/**
 * Parses an AI response that should be an array of reply options.
 * Always returns a string array, even on parse failure.
 */
export function parseAiReplies(raw: string): string[] {
  if (!raw) return ["No suggestions available."];
  const trimmed = raw.trim();

  // Strip code fences
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  const content = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const strings = parsed
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((s) => s.trim());
      if (strings.length > 0) return strings;
    }
    if (typeof parsed === "string" && parsed.trim()) {
      return [parsed.trim()];
    }
  } catch {
    // Not valid JSON
  }

  // Fallback: use the raw text as a single reply
  return [trimmed];
}

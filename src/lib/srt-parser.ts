export interface SrtSegment {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

function timeToSeconds(time: string): number {
  // Handles "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
  const parts = time.trim().replace(",", ".").split(":");
  if (parts.length !== 3) return 0;
  const [h, m, sAndMs] = parts;
  return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(sAndMs);
}

export function parseSRT(raw: string): SrtSegment[] {
  // Strip BOM
  const cleaned = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = cleaned.split(/\n\n+/).filter((b) => b.trim());

  const segments: SrtSegment[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeLine = lines[1];
    const arrowMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!arrowMatch) continue;

    const startSeconds = timeToSeconds(arrowMatch[1]);
    const endSeconds = timeToSeconds(arrowMatch[2]);
    const text = lines.slice(2).join(" ").replace(/<[^>]+>/g, "").trim();

    if (text) {
      segments.push({ index, startSeconds, endSeconds, text });
    }
  }

  return segments;
}

export function parseRetentionCSV(raw: string): Array<{ elapsed_seconds: number; retention_percent: number }> {
  const lines = raw.trim().split(/\n/).filter((l) => l.trim() && !l.startsWith("#"));
  const points: Array<{ elapsed_seconds: number; retention_percent: number }> = [];

  for (const line of lines) {
    const parts = line.split(/[,\t]+/).map((s) => s.trim());
    if (parts.length >= 2) {
      const elapsed_seconds = parseFloat(parts[0]);
      const retention_percent = parseFloat(parts[1]);
      if (!isNaN(elapsed_seconds) && !isNaN(retention_percent)) {
        points.push({ elapsed_seconds, retention_percent });
      }
    }
  }

  return points.sort((a, b) => a.elapsed_seconds - b.elapsed_seconds);
}

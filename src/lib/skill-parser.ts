import JSZip from "jszip";

export interface ParsedSkill {
  name: string;
  slug: string;
  description: string;
  category: "competitor" | "content" | "growth" | "audience" | "revenue" | "general";
  instructions: string;
  referenceDocs: { filename: string; content: string }[];
}

const VALID_CATEGORIES = ["competitor", "content", "growth", "audience", "revenue", "general"] as const;

/**
 * Parse a skill.md file into structured skill data.
 * Expected frontmatter format:
 * ---
 * name: My Skill
 * category: growth
 * description: Short description
 * ---
 * Rest is instructions...
 */
export function parseSkillMarkdown(raw: string): Omit<ParsedSkill, "referenceDocs"> {
  const lines = raw.split("\n");
  let inFrontmatter = false;
  let frontmatterDone = false;
  const meta: Record<string, string> = {};
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (!frontmatterDone && line.trim() === "---") {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        inFrontmatter = false;
        frontmatterDone = true;
        continue;
      }
    }
    if (inFrontmatter) {
      const match = line.match(/^(\w[\w_-]*)\s*:\s*(.+)$/);
      if (match) meta[match[1].trim().toLowerCase()] = match[2].trim();
    } else if (frontmatterDone) {
      bodyLines.push(line);
    }
  }

  // If no frontmatter found, try to extract name from first heading
  if (!frontmatterDone) {
    const heading = lines.find((l) => l.startsWith("# "));
    if (heading) {
      meta.name = heading.replace(/^#+\s*/, "").trim();
    }
    bodyLines.push(...lines.filter((l) => !l.startsWith("# ")));
  }

  const name = meta.name || "Untitled Skill";
  const slug = (meta.slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const rawCat = (meta.category || "general").toLowerCase();
  const category = VALID_CATEGORIES.includes(rawCat as any)
    ? (rawCat as ParsedSkill["category"])
    : "general";

  const description = meta.description || bodyLines.slice(0, 2).join(" ").trim().slice(0, 200) || name;
  const instructions = bodyLines.join("\n").trim();

  return { name, slug, description, category, instructions };
}

/**
 * Parse a ZIP file containing skill.md and optional reference .md files.
 */
export async function parseSkillZip(file: File): Promise<ParsedSkill> {
  const zip = await JSZip.loadAsync(file);

  // Find skill.md (could be at root or inside a folder)
  let skillMdContent: string | null = null;
  const referenceDocs: { filename: string; content: string }[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const filename = path.split("/").pop() || path;
    if (!filename.endsWith(".md")) continue;

    const content = await entry.async("text");

    if (filename.toLowerCase() === "skill.md") {
      skillMdContent = content;
    } else {
      referenceDocs.push({ filename, content });
    }
  }

  if (!skillMdContent) {
    throw new Error("No skill.md file found in the ZIP archive. Please include a skill.md file.");
  }

  const parsed = parseSkillMarkdown(skillMdContent);
  return { ...parsed, referenceDocs };
}

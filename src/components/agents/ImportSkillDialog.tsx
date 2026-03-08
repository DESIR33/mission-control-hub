import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, FileText, Package, AlertCircle } from "lucide-react";
import { parseSkillMarkdown, parseSkillZip, type ParsedSkill } from "@/lib/skill-parser";
import type { AgentSkill } from "@/types/agents";
import { CATEGORY_LABELS } from "@/types/agents";

interface ImportSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (skill: {
    name: string;
    slug: string;
    description: string;
    category: AgentSkill["category"];
    input_schema?: Record<string, unknown>;
  }) => void;
  isLoading: boolean;
}

export function ImportSkillDialog({
  open,
  onOpenChange,
  onImport,
  isLoading,
}: ImportSkillDialogProps) {
  const [tab, setTab] = useState<string>("zip");
  const [markdown, setMarkdown] = useState("");
  const [parsed, setParsed] = useState<ParsedSkill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setMarkdown("");
    setParsed(null);
    setError(null);
    setDragOver(false);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setParsed(null);
    try {
      if (file.name.endsWith(".zip")) {
        const result = await parseSkillZip(file);
        setParsed(result);
      } else if (file.name.endsWith(".md")) {
        const text = await file.text();
        const result = parseSkillMarkdown(text);
        setParsed({ ...result, referenceDocs: [] });
      } else {
        setError("Please upload a .zip or .md file");
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse file");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleParseMarkdown = () => {
    setError(null);
    setParsed(null);
    try {
      if (!markdown.trim()) {
        setError("Please paste your skill.md content");
        return;
      }
      const result = parseSkillMarkdown(markdown);
      setParsed({ ...result, referenceDocs: [] });
    } catch (err: any) {
      setError(err.message || "Failed to parse markdown");
    }
  };

  const handleImport = () => {
    if (!parsed) return;
    onImport({
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      category: parsed.category,
      input_schema: {
        _instructions: parsed.instructions,
        _reference_docs: parsed.referenceDocs,
      },
    });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Import Skill
          </DialogTitle>
          <DialogDescription>
            Import a skill from a ZIP archive (containing <code>skill.md</code> + reference <code>.md</code> files) or paste markdown directly.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); reset(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="zip" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Upload ZIP / .md
            </TabsTrigger>
            <TabsTrigger value="paste" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Paste Markdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zip" className="mt-3">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".zip,.md";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop a <code>.zip</code> or <code>.md</code> file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                ZIP should contain skill.md and optional reference .md files
              </p>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label>skill.md content</Label>
              <Textarea
                placeholder={`---\nname: My Skill\ncategory: growth\ndescription: Analyzes upload patterns\n---\n\nInstructions for the agent...`}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleParseMarkdown}>
              Parse
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {parsed && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{parsed.name}</h4>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[parsed.category] || parsed.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{parsed.description}</p>
            <p className="text-xs text-muted-foreground">
              Slug: <code className="bg-muted px-1 rounded">{parsed.slug}</code>
            </p>
            {parsed.instructions && (
              <div>
                <p className="text-xs font-medium mb-1">Instructions preview:</p>
                <ScrollArea className="h-[60px]">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{parsed.instructions.slice(0, 500)}{parsed.instructions.length > 500 ? "..." : ""}</pre>
                </ScrollArea>
              </div>
            )}
            {parsed.referenceDocs.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">
                  Reference docs ({parsed.referenceDocs.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {parsed.referenceDocs.map((doc) => (
                    <Badge key={doc.filename} variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {doc.filename}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isLoading || !parsed}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Import Skill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

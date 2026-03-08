import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Zap } from "lucide-react";
import type { AgentSkill } from "@/types/agents";
import { CATEGORY_LABELS } from "@/types/agents";
import ReactMarkdown from "react-markdown";

interface SkillDetailSheetProps {
  skill: AgentSkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillDetailSheet({ skill, open, onOpenChange }: SkillDetailSheetProps) {
  if (!skill) return null;

  const schema = skill.input_schema as Record<string, unknown> | null;
  const instructions = (schema?._instructions as string) || "";
  const referenceDocs = (schema?._reference_docs as { filename: string; content: string }[]) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            {skill.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[skill.category] || skill.category}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {skill.skill_type}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{skill.description}</p>
        </div>

        <Separator className="my-4" />

        {(instructions || referenceDocs.length > 0) ? (
          <Tabs defaultValue="instructions">
            <TabsList className="w-full">
              <TabsTrigger value="instructions" className="text-xs flex-1">Instructions</TabsTrigger>
              {referenceDocs.length > 0 && (
                <TabsTrigger value="references" className="text-xs flex-1">
                  References ({referenceDocs.length})
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="instructions" className="mt-3">
              <ScrollArea className="h-[400px]">
                {instructions ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{instructions}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No instructions provided.</p>
                )}
              </ScrollArea>
            </TabsContent>
            {referenceDocs.length > 0 && (
              <TabsContent value="references" className="mt-3">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {referenceDocs.map((doc) => (
                      <div key={doc.filename} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{doc.filename}</span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{doc.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No additional documentation for this skill.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

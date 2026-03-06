import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Plus, Trash2 } from "lucide-react";
import type { AgentSkill } from "@/types/agents";
import { CATEGORY_LABELS } from "@/types/agents";

interface SkillManagerProps {
  skills: AgentSkill[];
  onCreateSkill: () => void;
  onDeleteSkill: (id: string) => void;
}

export function SkillManager({ skills, onCreateSkill, onDeleteSkill }: SkillManagerProps) {
  const grouped = skills.reduce<Record<string, AgentSkill[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Skills Registry
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCreateSkill}>
            <Plus className="h-3 w-3 mr-1" />
            New Skill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, catSkills]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category] || category} ({catSkills.length})
                </h4>
                <div className="space-y-1.5">
                  {catSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                        <span className="text-sm truncate">{skill.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {skill.skill_type}
                        </Badge>
                      </div>
                      {skill.skill_type === "custom" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onDeleteSkill(skill.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No skills available yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

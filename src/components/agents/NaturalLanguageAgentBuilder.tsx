import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Wand2, Loader2, Check, Bot } from "lucide-react";
import { useSkills } from "@/hooks/use-agents";

interface ParsedAgentConfig {
  name: string;
  description: string;
  suggestedSkills: string[];
  triggerDescription: string;
  schedule: string;
}

export function NaturalLanguageAgentBuilder() {
  const [prompt, setPrompt] = useState("");
  const [parsed, setParsed] = useState<ParsedAgentConfig | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const { data: skills = [] } = useSkills();

  const handleParse = () => {
    if (!prompt.trim()) return;
    setIsParsing(true);

    // Client-side NL parsing heuristic
    setTimeout(() => {
      const lower = prompt.toLowerCase();
      const suggestedSkills: string[] = [];

      if (lower.includes("contact") || lower.includes("crm")) suggestedSkills.push("query_crm_data");
      if (lower.includes("video") || lower.includes("youtube")) suggestedSkills.push("query_youtube_stats");
      if (lower.includes("revenue") || lower.includes("deal")) suggestedSkills.push("query_revenue_data");
      if (lower.includes("email") || lower.includes("inbox")) suggestedSkills.push("query_crm_data");
      if (lower.includes("competitor")) suggestedSkills.push("query_competitors");
      if (lower.includes("growth") || lower.includes("goal")) suggestedSkills.push("query_growth_goals");
      suggestedSkills.push("create_proposal");

      // Extract time patterns
      let schedule = "On demand";
      if (lower.includes("daily")) schedule = "Daily at 9:00 AM";
      if (lower.includes("weekly")) schedule = "Weekly on Monday";
      if (lower.includes("hourly")) schedule = "Every hour";

      // Extract trigger
      let triggerDescription = "Manual trigger";
      if (lower.includes("alert") || lower.includes("notify"))
        triggerDescription = "When threshold conditions are met";
      if (lower.includes("new") && lower.includes("contact"))
        triggerDescription = "When a new contact is added";
      if (lower.includes("no interaction") || lower.includes("inactive"))
        triggerDescription = "When inactivity is detected";

      const words = prompt.split(" ").slice(0, 5).join(" ");
      setParsed({
        name: words.length > 30 ? words.slice(0, 30) + "..." : words,
        description: prompt,
        suggestedSkills,
        triggerDescription,
        schedule,
      });
      setIsParsing(false);
    }, 800);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          Natural Language Agent Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder='Describe what you want in plain English, e.g. "Monitor my top 10 contacts and alert me if no interaction in 14 days"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button onClick={handleParse} disabled={!prompt.trim() || isParsing} size="sm" className="w-full">
            {isParsing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Generate Agent Config
          </Button>
        </div>

        {parsed && (
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">Generated Config</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{parsed.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Schedule</p>
                <p className="font-medium">{parsed.schedule}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Trigger</p>
                <p className="font-medium">{parsed.triggerDescription}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Suggested Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.suggestedSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full gap-2">
              <Check className="h-4 w-4" />
              Create Agent
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

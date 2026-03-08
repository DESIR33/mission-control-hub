import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Store, Search, Download, CheckCircle2, Zap } from "lucide-react";
import { useSkills, useCreateSkill } from "@/hooks/use-agents";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceSkill {
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  popularity: number;
}

const MARKETPLACE_SKILLS: MarketplaceSkill[] = [
  { name: "Sponsorship Rate Calculator", slug: "sponsorship-rate-calc", description: "Calculate fair sponsorship rates based on channel metrics, niche, and engagement.", category: "revenue", tags: ["monetization", "pricing"], popularity: 94 },
  { name: "Competitor Title Analyzer", slug: "competitor-title-analyzer", description: "Analyze competitor video titles for patterns, hooks, and keyword strategies.", category: "content", tags: ["seo", "research"], popularity: 87 },
  { name: "Email Sentiment Scorer", slug: "email-sentiment-scorer", description: "Score incoming emails by sentiment to prioritize relationship management.", category: "crm", tags: ["email", "nlp"], popularity: 82 },
  { name: "Thumbnail A/B Predictor", slug: "thumbnail-ab-predictor", description: "Predict thumbnail click-through rates using visual analysis patterns.", category: "content", tags: ["thumbnails", "prediction"], popularity: 79 },
  { name: "Deal Value Estimator", slug: "deal-value-estimator", description: "Estimate deal values based on company size, industry benchmarks, and historical data.", category: "revenue", tags: ["deals", "estimation"], popularity: 76 },
  { name: "Audience Overlap Detector", slug: "audience-overlap-detector", description: "Detect audience overlap between your channel and potential collaboration partners.", category: "growth", tags: ["collaboration", "audience"], popularity: 73 },
  { name: "Content Calendar Optimizer", slug: "content-calendar-optimizer", description: "Optimize publishing schedule based on audience activity and competition analysis.", category: "content", tags: ["scheduling", "optimization"], popularity: 71 },
  { name: "Brand Safety Checker", slug: "brand-safety-checker", description: "Check video content alignment with brand guidelines before sponsorship pitches.", category: "crm", tags: ["brand", "compliance"], popularity: 68 },
];

export function AgentSkillMarketplace() {
  const { toast } = useToast();
  const { data: installedSkills = [] } = useSkills();
  const createSkill = useCreateSkill();
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);

  const installedSlugs = new Set(installedSkills.map((s) => s.slug));

  const filtered = MARKETPLACE_SKILLS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.includes(search.toLowerCase()))
  );

  const handleInstall = async (skill: MarketplaceSkill) => {
    setInstalling(skill.slug);
    try {
      await createSkill.mutateAsync({
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        category: skill.category as any,
      });
      toast({ title: "Skill installed", description: `${skill.name} is now available.` });
    } catch (err: any) {
      toast({ title: "Install failed", description: err.message, variant: "destructive" });
    } finally {
      setInstalling(null);
    }
  };

  const categoryColors: Record<string, string> = {
    revenue: "bg-green-500/10 text-green-700 dark:text-green-400",
    content: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    crm: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    growth: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          Skill Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <ScrollArea className="h-[350px]">
          <div className="space-y-2">
            {filtered.map((skill) => {
              const installed = installedSlugs.has(skill.slug);
              return (
                <div key={skill.slug} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <p className="text-xs font-medium truncate">{skill.name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{skill.description}</p>
                    </div>
                    {installed ? (
                      <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Installed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 shrink-0"
                        onClick={() => handleInstall(skill)}
                        disabled={installing === skill.slug}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Install
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${categoryColors[skill.category] || ""}`}>
                      {skill.category}
                    </Badge>
                    {skill.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                        {tag}
                      </Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-auto">★ {skill.popularity}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

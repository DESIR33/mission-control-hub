import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Wand2, Globe, Image, FileSearch, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";

interface EnrichmentSource {
  name: string;
  key: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

export function AutoEnrichmentPipeline() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [sources] = useState<EnrichmentSource[]>([
    { name: "Brandfetch", key: "brandfetch", icon: <Image className="h-3.5 w-3.5" />, description: "Logos, colors, fonts, and brand assets", enabled: true },
    { name: "Firecrawl", key: "firecrawl", icon: <Globe className="h-3.5 w-3.5" />, description: "Website scraping for descriptions, tech stack", enabled: true },
    { name: "AI Analysis", key: "ai", icon: <Wand2 className="h-3.5 w-3.5" />, description: "AI-powered industry classification and sizing", enabled: true },
  ]);

  const { data: unenriched = [], isLoading } = useQuery({
    queryKey: ["unenriched-companies", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await (supabase as any)
        .from("companies")
        .select("id, name, website, logo_url, enrichment_brandfetch, enrichment_firecrawl, industry, description")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      return (data || []).filter((c: any) => {
        const missing = (!c.logo_url && !c.enrichment_brandfetch) || !c.enrichment_firecrawl || !c.industry;
        return missing;
      });
    },
    enabled: !!workspaceId,
  });

  const enrichMutation = useMutation({
    mutationFn: async (companyId: string) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("enrich-company", {
        body: { workspace_id: workspaceId, company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Enrichment started" });
      qc.invalidateQueries({ queryKey: ["unenriched-companies"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => {
      toast({ title: "Enrichment failed", description: e.message, variant: "destructive" });
    },
  });

  const getMissingFields = (company: any): string[] => {
    const missing: string[] = [];
    if (!company.logo_url && !company.enrichment_brandfetch) missing.push("logo");
    if (!company.enrichment_firecrawl) missing.push("website data");
    if (!company.industry) missing.push("industry");
    if (!company.description) missing.push("description");
    return missing;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          Auto-Enrichment Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sources */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data Sources</p>
          {sources.map((src) => (
            <div key={src.key} className="flex items-center justify-between p-2 rounded border border-border">
              <div className="flex items-center gap-2">
                {src.icon}
                <div>
                  <p className="text-xs font-medium">{src.name}</p>
                  <p className="text-[10px] text-muted-foreground">{src.description}</p>
                </div>
              </div>
              <Switch checked={src.enabled} disabled />
            </div>
          ))}
        </div>

        {/* Unenriched Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Needs Enrichment</p>
            <Badge variant="secondary" className="text-[10px]">{unenriched.length}</Badge>
          </div>
          <ScrollArea className="h-[250px]">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>
            ) : unenriched.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">All companies enriched!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unenriched.map((company: any) => {
                  const missing = getMissingFields(company);
                  return (
                    <div key={company.id} className="flex items-center justify-between p-2 rounded border border-border">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{company.name}</p>
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {missing.map((m) => (
                            <Badge key={m} variant="outline" className="text-[10px] px-1 py-0 text-amber-600">
                              <AlertCircle className="h-2 w-2 mr-0.5" />
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 shrink-0 ml-2"
                        onClick={() => enrichMutation.mutate(company.id)}
                        disabled={enrichMutation.isPending}
                      >
                        {enrichMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

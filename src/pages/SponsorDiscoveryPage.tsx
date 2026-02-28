import { useState } from "react";
import { Compass, Plus, Search, Loader2, Building2, ExternalLink, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WorkspaceProvider, useWorkspace } from "@/hooks/use-workspace";
import { useCreateCompany } from "@/hooks/use-companies";
import { useCreateDeal } from "@/hooks/use-deals";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DiscoveredSponsor {
  name: string;
  mentions: number;
  sources: string[];
  addedToCrm?: boolean;
}

function SponsorDiscoveryContent() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const createCompany = useCreateCompany();
  const createDeal = useCreateDeal();

  const [channelUrls, setChannelUrls] = useState<string[]>([""]);
  const [sponsors, setSponsors] = useState<DiscoveredSponsor[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const addUrlField = () => {
    if (channelUrls.length < 5) {
      setChannelUrls([...channelUrls, ""]);
    }
  };

  const removeUrlField = (index: number) => {
    setChannelUrls(channelUrls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const updated = [...channelUrls];
    updated[index] = value;
    setChannelUrls(updated);
  };

  const handleDiscover = async () => {
    const validUrls = channelUrls.filter((u) => u.trim());
    if (!validUrls.length || !workspaceId) {
      toast({ title: "Enter at least one channel URL", variant: "destructive" });
      return;
    }

    setIsDiscovering(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("discover-sponsors", {
        body: { workspace_id: workspaceId, channel_urls: validUrls },
      });

      if (error) throw error;

      if (data?.sponsors) {
        setSponsors(data.sponsors.map((s: any) => ({ ...s, addedToCrm: false })));
        toast({ title: `Found ${data.sponsors.length} potential sponsors` });
      } else {
        setSponsors([]);
        toast({ title: "No sponsors found in those channels" });
      }
    } catch (err: any) {
      toast({ title: "Discovery failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddToCrm = async (sponsor: DiscoveredSponsor, index: number) => {
    try {
      const companyResult = await createCompany.mutateAsync({
        name: sponsor.name,
        notes: `Discovered via sponsor discovery. Mentioned ${sponsor.mentions} time(s) in: ${sponsor.sources.join(", ")}`,
      } as any);

      if (companyResult?.id) {
        await createDeal.mutateAsync({
          title: `${sponsor.name} Sponsorship`,
          stage: "prospecting",
          company_id: companyResult.id,
          notes: `Auto-created from sponsor discovery. ${sponsor.mentions} mention(s) found.`,
        });
      }

      const updated = [...sponsors];
      updated[index] = { ...sponsor, addedToCrm: true };
      setSponsors(updated);

      toast({ title: `${sponsor.name} added to CRM with prospecting deal` });
    } catch (err: any) {
      toast({ title: "Failed to add to CRM", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Sponsor Discovery</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste competitor YouTube channel URLs to discover their sponsors. Found sponsors can be added to your CRM instantly.
        </p>
      </div>

      {/* Channel URL Input */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Competitor Channels</h2>
        <p className="text-xs text-muted-foreground">
          Enter up to 5 YouTube channel URLs. We'll analyze their recent videos for sponsor mentions.
        </p>

        <div className="space-y-2">
          {channelUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder="https://youtube.com/@channelname"
                className="flex-1 bg-secondary border-border"
              />
              {channelUrls.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeUrlField(i)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {channelUrls.length < 5 && (
            <Button variant="outline" size="sm" onClick={addUrlField}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Channel
            </Button>
          )}
          <Button onClick={handleDiscover} disabled={isDiscovering} className="ml-auto">
            {isDiscovering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Discover Sponsors
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {sponsors.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Discovered Sponsors ({sponsors.length})
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sponsors.map((sponsor, i) => (
              <div
                key={`${sponsor.name}-${i}`}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{sponsor.name}</h3>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {sponsor.mentions} mention{sponsor.mentions !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {sponsor.mentions}x
                  </Badge>
                </div>

                {sponsor.sources.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sources</p>
                    {sponsor.sources.map((src, si) => (
                      <p key={si} className="text-xs text-muted-foreground truncate" title={src}>
                        {src}
                      </p>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  variant={sponsor.addedToCrm ? "outline" : "default"}
                  className="w-full text-xs"
                  disabled={sponsor.addedToCrm}
                  onClick={() => handleAddToCrm(sponsor, i)}
                >
                  {sponsor.addedToCrm ? (
                    "Added to CRM"
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add to CRM
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state after search */}
      {hasSearched && sponsors.length === 0 && !isDiscovering && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No sponsors found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try different channels or channels with more sponsored content.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SponsorDiscoveryPage() {
  return (
    <WorkspaceProvider>
      <SponsorDiscoveryContent />
    </WorkspaceProvider>
  );
}

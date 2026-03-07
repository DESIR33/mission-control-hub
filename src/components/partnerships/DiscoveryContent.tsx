import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  Plus,
  Search,
  Loader2,
  Building2,
  ExternalLink,
  TrendingUp,
  X,
  Mail,
  Copy,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCreateCompany, useCompanies } from "@/hooks/use-companies";
import { useCreateDeal } from "@/hooks/use-deals";
import { useSponsorMatchScore } from "@/hooks/use-sponsor-match-score";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OutreachPipelineDialog } from "@/components/crm/OutreachPipelineDialog";

interface DiscoveredSponsor {
  name: string;
  mentions: number;
  sources: string[];
  addedToCrm?: boolean;
}

function generateOutreachTemplate(companyName: string): string {
  return `Hi {{company_name}} Team,

I hope this message finds you well! My name is [Your Name], and I run [Your Channel Name] -- a YouTube channel focused on [Your Niche] with [{{subscriber_count}}] subscribers and an average of [{{avg_views}}] views per video.

I noticed that ${companyName} has been actively partnering with creators in our space, and I believe there's a fantastic opportunity for us to collaborate.

Here's a quick snapshot of my channel stats:
- Subscribers: {{subscriber_count}}
- Average views per video: {{avg_views}}
- Audience demographic: {{audience_demographic}}
- Engagement rate: {{engagement_rate}}

I'd love to discuss how a sponsorship with ${companyName} could look -- whether that's a dedicated video, an integrated segment, or a series partnership.

Would you be open to a quick call this week to explore this further?

Looking forward to hearing from you!

Best regards,
[Your Name]
[Your Channel Name]
[Your Email]`;
}

export function DiscoveryContent() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const createCompany = useCreateCompany();
  const createDeal = useCreateDeal();
  const { data: existingCompanies = [] } = useCompanies();
  const { data: matchScores = [] } = useSponsorMatchScore();

  const [channelUrls, setChannelUrls] = useState<string[]>([""]);
  const [sponsors, setSponsors] = useState<DiscoveredSponsor[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);
  const [outreachSponsorName, setOutreachSponsorName] = useState("");
  const [outreachBody, setOutreachBody] = useState("");

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const allSelected = useMemo(
    () => sponsors.length > 0 && selectedIndices.size === sponsors.length,
    [sponsors.length, selectedIndices.size]
  );

  const someSelected = useMemo(
    () => selectedIndices.size > 0 && selectedIndices.size < sponsors.length,
    [sponsors.length, selectedIndices.size]
  );

  const selectedCount = selectedIndices.size;

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
      toast.error("Enter at least one channel URL");
      return;
    }

    setIsDiscovering(true);
    setHasSearched(true);
    setSelectedIndices(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("discover-sponsors", {
        body: { workspace_id: workspaceId, channel_urls: validUrls },
      });

      if (error) throw error;

      if (data?.sponsors) {
        setSponsors(data.sponsors.map((s: any) => ({ ...s, addedToCrm: false })));
        toast.success(`Found ${data.sponsors.length} potential sponsors`);
      } else {
        setSponsors([]);
        toast.info("No sponsors found in those channels");
      }
    } catch (err: any) {
      toast.error("Discovery failed", { description: err.message });
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

      setSelectedIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });

      toast.success(`${sponsor.name} added to CRM with prospecting deal`);
    } catch (err: any) {
      toast.error("Failed to add to CRM", { description: err.message });
    }
  };

  const handleDraftOutreach = (sponsor: DiscoveredSponsor) => {
    setOutreachSponsorName(sponsor.name);
    setOutreachBody(generateOutreachTemplate(sponsor.name));
    setOutreachDialogOpen(true);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outreachBody);
      toast.success("Email template copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleOpenInInbox = () => {
    setOutreachDialogOpen(false);
    navigate("/inbox");
  };

  const toggleSelectAll = () => {
    if (allSelected || someSelected) {
      setSelectedIndices(new Set());
    } else {
      const all = new Set<number>();
      sponsors.forEach((_, i) => all.add(i));
      setSelectedIndices(all);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleBulkImport = async () => {
    const toImport = Array.from(selectedIndices)
      .map((i) => ({ sponsor: sponsors[i], index: i }))
      .filter(({ sponsor }) => !sponsor.addedToCrm);

    if (toImport.length === 0) {
      toast.info("All selected sponsors have already been added to CRM");
      return;
    }

    setIsBulkImporting(true);

    const existingNames = new Set(
      existingCompanies.map((c) => c.name.toLowerCase())
    );

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    const toastId = toast.loading(
      `Importing 0/${toImport.length} sponsors to CRM...`
    );

    for (let idx = 0; idx < toImport.length; idx++) {
      const { sponsor, index } = toImport[idx];

      if (existingNames.has(sponsor.name.toLowerCase())) {
        skipCount++;
        const updated = [...sponsors];
        updated[index] = { ...updated[index], addedToCrm: true };
        setSponsors(updated);
        toast.loading(
          `Importing ${idx + 1}/${toImport.length} sponsors to CRM...`,
          { id: toastId }
        );
        continue;
      }

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
            notes: `Auto-created from sponsor discovery (bulk import). ${sponsor.mentions} mention(s) found.`,
          });
        }

        existingNames.add(sponsor.name.toLowerCase());

        const updated = [...sponsors];
        updated[index] = { ...updated[index], addedToCrm: true };
        setSponsors(updated);
        successCount++;
      } catch {
        failCount++;
      }

      toast.loading(
        `Importing ${idx + 1}/${toImport.length} sponsors to CRM...`,
        { id: toastId }
      );
    }

    setIsBulkImporting(false);
    setSelectedIndices(new Set());

    const parts: string[] = [];
    if (successCount > 0) parts.push(`${successCount} added`);
    if (skipCount > 0) parts.push(`${skipCount} already existed`);
    if (failCount > 0) parts.push(`${failCount} failed`);

    if (failCount > 0) {
      toast.warning(`Bulk import complete: ${parts.join(", ")}`, { id: toastId });
    } else {
      toast.success(`Bulk import complete: ${parts.join(", ")}`, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex justify-end">
        <OutreachPipelineDialog />
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all sponsors"
              />
              <h2 className="text-sm font-semibold text-foreground">
                Discovered Sponsors ({sponsors.length})
              </h2>
              {selectedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedCount} selected
                </Badge>
              )}
            </div>

            {selectedCount > 0 && (
              <Button
                size="sm"
                onClick={handleBulkImport}
                disabled={isBulkImporting}
              >
                {isBulkImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    Bulk Import to CRM ({selectedCount})
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sponsors.map((sponsor, i) => (
              <div
                key={`${sponsor.name}-${i}`}
                className={`rounded-lg border bg-card p-4 space-y-3 ${
                  selectedIndices.has(i)
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIndices.has(i)}
                      onCheckedChange={() => toggleSelect(i)}
                      aria-label={`Select ${sponsor.name}`}
                      className="mt-0.5"
                    />
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
                  {(() => {
                    const match = matchScores.find((m) => m.companyName.toLowerCase() === sponsor.name.toLowerCase());
                    if (!match) return null;
                    const color = match.matchScore >= 70 ? "bg-green-500/15 text-green-600 border-green-500/30" : match.matchScore >= 40 ? "bg-amber-500/15 text-amber-600 border-amber-500/30" : "bg-gray-500/15 text-gray-500 border-gray-500/30";
                    return <Badge variant="outline" className={`text-xs shrink-0 ${color}`}>{match.matchScore}pts</Badge>;
                  })()}
                  <Badge variant="outline" className="text-xs shrink-0">
                    {sponsor.mentions}x
                  </Badge>
                </div>

                {sponsor.sources.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Sources</p>
                    {sponsor.sources.map((src, si) => (
                      <p key={si} className="text-xs text-muted-foreground truncate" title={src}>
                        {src}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={sponsor.addedToCrm ? "outline" : "default"}
                    className="flex-1 text-xs"
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

                  {sponsor.addedToCrm && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleDraftOutreach(sponsor)}
                    >
                      <Mail className="w-3.5 h-3.5 mr-1" />
                      Draft Outreach
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && sponsors.length === 0 && !isDiscovering && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No sponsors found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try different channels or channels with more sponsored content.
          </p>
        </div>
      )}

      {/* Outreach Email Template Dialog */}
      <Dialog open={outreachDialogOpen} onOpenChange={setOutreachDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft Outreach: {outreachSponsorName}</DialogTitle>
            <DialogDescription>
              Edit the email template below. Replace merge tags like {"{{company_name}}"} and
              placeholders in [brackets] with your actual details before sending.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">{"{{company_name}}"}</Badge>
              <Badge variant="secondary" className="text-xs">{"{{subscriber_count}}"}</Badge>
              <Badge variant="secondary" className="text-xs">{"{{avg_views}}"}</Badge>
              <Badge variant="secondary" className="text-xs">{"{{audience_demographic}}"}</Badge>
              <Badge variant="secondary" className="text-xs">{"{{engagement_rate}}"}</Badge>
            </div>

            <Textarea
              value={outreachBody}
              onChange={(e) => setOutreachBody(e.target.value)}
              className="min-h-[350px] font-mono text-sm bg-secondary border-border"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCopyToClipboard}>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy to Clipboard
            </Button>
            <Button onClick={handleOpenInInbox}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open in Inbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

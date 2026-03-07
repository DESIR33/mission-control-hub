import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Mail, Sparkles, ListPlus, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCompanies } from "@/hooks/use-companies";

const DEFAULT_TEMPLATE = `Hi there,

I'm reaching out from {{channel_name}} — a YouTube channel with {{subscriber_count}} subscribers and an average of {{avg_views}} views per video.

I think {{company_name}} would be a fantastic fit for a sponsored integration on our channel. Our audience is highly engaged and aligns well with your brand.

I'd love to chat about potential collaboration opportunities. Would you be open to a quick call this week?

Best regards`;

interface SponsorOutreachGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCompanyId?: string | null;
  preselectedContactId?: string | null;
}

export function SponsorOutreachGenerator({
  open,
  onOpenChange,
  preselectedCompanyId,
  preselectedContactId,
}: SponsorOutreachGeneratorProps) {
  const { workspaceId } = useWorkspace();
  const { data: companies = [] } = useCompanies();
  const queryClient = useQueryClient();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(preselectedCompanyId ?? "");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [subject, setSubject] = useState("Sponsorship Opportunity - {{channel_name}}");

  // Fetch channel stats
  const { data: channelStats } = useQuery({
    queryKey: ["channel-stats-outreach", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_channel_stats" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!workspaceId,
  });

  const channelName = channelStats?.channel_title ?? "My Channel";
  const subscriberCount = channelStats?.subscriber_count
    ? Number(channelStats.subscriber_count).toLocaleString()
    : "N/A";
  const avgViews = channelStats?.avg_views
    ? Number(channelStats.avg_views).toLocaleString()
    : channelStats?.view_count
    ? Math.round(Number(channelStats.view_count) / Math.max(Number(channelStats.video_count) || 1, 1)).toLocaleString()
    : "N/A";

  const selectedCompany = useMemo(
    () => companies.find((c: any) => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    const companyName = (selectedCompany as any)?.name ?? "Your Company";

    const email = template
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{channel_name\}\}/g, channelName)
      .replace(/\{\{subscriber_count\}\}/g, subscriberCount)
      .replace(/\{\{avg_views\}\}/g, avgViews);

    const resolvedSubject = subject
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{channel_name\}\}/g, channelName)
      .replace(/\{\{subscriber_count\}\}/g, subscriberCount)
      .replace(/\{\{avg_views\}\}/g, avgViews);

    setSubject(resolvedSubject);

    setTimeout(() => {
      setGeneratedEmail(email);
      setIsGenerating(false);
      toast.success("Email draft generated");
    }, 500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEmail);
    toast.success("Email copied to clipboard");
  };

  const enrollInSequence = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !selectedCompanyId) throw new Error("Missing data");

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("sequence_send_log" as any)
        .insert({
          workspace_id: workspaceId,
          contact_id: preselectedContactId ?? null,
          company_id: selectedCompanyId,
          sequence_step: 1,
          subject: subject,
          body: generatedEmail || template,
          status: "queued",
          opened_count: 0,
          created_by: user?.id,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact enrolled in outreach sequence");
      queryClient.invalidateQueries({ queryKey: ["sponsor-email-engagement"] });
      setIsEnrolling(false);
    },
    onError: (err: any) => {
      toast.error("Failed to enroll in sequence", { description: err.message });
      setIsEnrolling(false);
    },
  });

  const handleEnroll = () => {
    setIsEnrolling(true);
    enrollInSequence.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Generate Sponsor Outreach
          </DialogTitle>
          <DialogDescription>
            Create a personalized outreach email using your channel stats as a media kit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Channel Stats Preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Your Media Kit Data
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-xs">
                Channel: {channelName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Subscribers: {subscriberCount}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Avg Views: {avgViews}
              </Badge>
            </div>
          </div>

          {/* Company Select */}
          <div className="space-y-2">
            <Label className="text-sm">Target Company</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm">Subject Line</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Email Template</Label>
              <div className="flex gap-1">
                {["{{company_name}}", "{{channel_name}}", "{{subscriber_count}}", "{{avg_views}}"].map(
                  (tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        setTemplate((prev) => prev + " " + tag);
                      }}
                    >
                      {tag}
                    </Badge>
                  )
                )}
              </div>
            </div>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="min-h-[180px] text-sm font-mono"
              placeholder="Write your outreach template..."
            />
          </div>

          {/* Generated Email Preview */}
          {generatedEmail && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Generated Email</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-sm whitespace-pre-wrap">
                {generatedEmail}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating || !selectedCompanyId}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Email
            </Button>

            {generatedEmail && (
              <Button
                variant="outline"
                onClick={handleEnroll}
                disabled={isEnrolling || enrollInSequence.isPending}
              >
                {isEnrolling || enrollInSequence.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ListPlus className="w-4 h-4 mr-2" />
                )}
                Enroll in Sequence
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

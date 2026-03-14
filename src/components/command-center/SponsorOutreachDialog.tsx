import { useState } from "react";
import { Mail, Copy, RefreshCw, Sparkles, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useGenerateOutreachEmail, type OutreachEmailResult } from "@/hooks/use-outreach-email-generator";
import type { CompetitorSponsor } from "@/hooks/use-competitor-sponsors";

interface SponsorOutreachDialogProps {
  sponsor: CompetitorSponsor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SponsorOutreachDialog({ sponsor, open, onOpenChange }: SponsorOutreachDialogProps) {
  const [tone, setTone] = useState<"professional" | "casual" | "bold">("professional");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState<OutreachEmailResult | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);
  const generate = useGenerateOutreachEmail();

  const handleGenerate = () => {
    if (!sponsor) return;
    generate.mutate(
      { sponsor, tone, additionalContext: additionalContext.trim() || undefined },
      {
        onSuccess: (data) => {
          setResult(data);
          setEditedSubject(data.subject);
          setEditedBody(data.body);
        },
        onError: () => toast.error("Generation failed — try again"),
      },
    );
  };

  const handleCopy = async () => {
    const text = `Subject: ${editedSubject}\n\n${editedBody}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBody = async () => {
    await navigator.clipboard.writeText(editedBody);
    setCopied(true);
    toast.success("Email body copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setEditedSubject("");
    setEditedBody("");
  };

  if (!sponsor) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset(); }}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mail className="w-5 h-5 text-primary" />
            Outreach Email — {sponsor.sponsor_name}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5 mt-2">
            {/* Sponsor context */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sponsor Intel</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Brand:</span>{" "}
                  <span className="font-medium text-foreground">{sponsor.sponsor_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mentions:</span>{" "}
                  <span className="font-medium text-foreground">{sponsor.mention_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Competitors:</span>{" "}
                  <span className="font-medium text-foreground">{sponsor.competitor_channels?.length || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Detection:</span>{" "}
                  <span className="font-medium text-foreground">{sponsor.detection_method}</span>
                </div>
              </div>
              {sponsor.competitor_channels?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {sponsor.competitor_channels.slice(0, 6).map((ch) => (
                    <Badge key={ch} variant="secondary" className="text-[10px]">{ch}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Tone selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Email Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <span className="flex items-center gap-2">💼 Professional</span>
                  </SelectItem>
                  <SelectItem value="casual">
                    <span className="flex items-center gap-2">😊 Casual & Friendly</span>
                  </SelectItem>
                  <SelectItem value="bold">
                    <span className="flex items-center gap-2">🔥 Bold & Direct</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional context */}
            <div className="space-y-1.5">
              <Label className="text-xs">Additional Context (optional)</Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="E.g. I recently reviewed a similar product, my audience skews toward developers, I want to propose a 3-video series…"
                className="bg-secondary border-border text-sm min-h-[80px]"
              />
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="w-full gap-2"
            >
              {generate.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Outreach Email
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Subject line */}
            <div className="space-y-1.5">
              <Label className="text-xs">Subject Line</Label>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Email body */}
            <div className="space-y-1.5">
              <Label className="text-xs">Email Body</Label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="bg-secondary border-border text-sm min-h-[280px] leading-relaxed font-mono text-xs"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={generate.isPending}>
                <RefreshCw className={`w-3.5 h-3.5 ${generate.isPending ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyBody}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Body
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Full Email
                </Button>
              </div>
            </div>

            {/* Tip */}
            <p className="text-[10px] text-muted-foreground text-center">
              Tip: Edit the email above before copying. Use competitor names naturally to show you've done your research.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

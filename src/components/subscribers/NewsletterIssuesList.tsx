import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNewsletterIssues, useCreateNewsletterIssue } from "@/hooks/use-newsletter-issues";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Mail, Send, Eye, MousePointer, MessageSquare, Loader2, Calendar, ExternalLink } from "lucide-react";
import { DistanceToNow } from "date-fns";
import { safeFormatDistanceToNow } from "@/lib/date-utils";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/15 text-primary border-primary/30",
  sending: "bg-warning/15 text-warning border-warning/30",
  sent: "bg-success/15 text-success border-success/30",
  archived: "bg-muted text-muted-foreground",
};

export function NewsletterIssuesList() {
  const { data: issues = [], isLoading } = useNewsletterIssues();
  const createIssue = useCreateNewsletterIssue();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createIssue.mutateAsync({
        name: fd.get("name") as string,
        subject: fd.get("subject") as string,
        topic_tags: (fd.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast({ title: "Issue created" });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Newsletter Issues</h3>
          <p className="text-xs text-muted-foreground">Campaigns sent to your subscribers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Issue</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create Newsletter Issue</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="iss_name">Name *</Label>
                <Input id="iss_name" name="name" required placeholder="March Roundup" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iss_subj">Subject Line *</Label>
                <Input id="iss_subj" name="subject" required placeholder="🚀 New videos this week" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iss_tags">Topics (comma-separated)</Label>
                <Input id="iss_tags" name="tags" placeholder="tutorial, update, behind-the-scenes" className="bg-secondary border-border" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createIssue.isPending}>
                  {createIssue.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {issues.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No newsletter issues yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue) => {
            const recipients = issue.email_sent_count || issue.total_recipients || 1;
            const opens = issue.email_unique_open_count || issue.opened_count;
            const clicks = issue.email_unique_click_count || issue.clicked_count;
            const openRate = recipients > 0 ? Math.round((opens / recipients) * 100) : 0;
            const clickRate = recipients > 0 ? Math.round((clicks / recipients) * 100) : 0;
            const isBeehiiv = !!issue.beehiiv_post_id;
            return (
              <Card key={issue.id} className="bg-card border-border flex flex-col">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={cn("text-xs shrink-0", statusStyles[issue.status])}>
                      {issue.status}
                    </Badge>
                    {isBeehiiv && (
                      <Badge variant="outline" className="text-[10px] shrink-0 border-amber-600/40 text-amber-400 bg-amber-950/30">🐝 Beehiiv</Badge>
                    )}
                    {issue.web_url && (
                      <a href={issue.web_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{issue.name}</CardTitle>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{issue.subject}</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col justify-between gap-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-secondary/50 rounded-md py-2 px-1">
                      <p className="text-xs font-semibold text-foreground">{recipients.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><Send className="w-2.5 h-2.5" /> Sent</p>
                    </div>
                    <div className="bg-secondary/50 rounded-md py-2 px-1">
                      <p className="text-xs font-semibold text-foreground">{openRate}%</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><Eye className="w-2.5 h-2.5" /> Opens</p>
                    </div>
                    <div className="bg-secondary/50 rounded-md py-2 px-1">
                      <p className="text-xs font-semibold text-foreground">{clickRate}%</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><MousePointer className="w-2.5 h-2.5" /> Clicks</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {issue.topic_tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))}
                      {issue.topic_tags.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{issue.topic_tags.length - 2}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {issue.publish_date
                        ? safeFormatDistanceToNow(issue.publish_date, { addSuffix: true })
                        : issue.sent_at
                        ? safeFormatDistanceToNow(issue.sent_at, { addSuffix: true })
                        : safeFormatDistanceToNow(issue.created_at, { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
import { Plus, Mail, Send, Eye, MousePointer, MessageSquare, Loader2, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
        <div className="space-y-3">
          {issues.map((issue) => {
            const openRate = issue.total_recipients > 0 ? Math.round((issue.opened_count / issue.total_recipients) * 100) : 0;
            const clickRate = issue.total_recipients > 0 ? Math.round((issue.clicked_count / issue.total_recipients) * 100) : 0;
            return (
              <Card key={issue.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground truncate">{issue.name}</h4>
                        <Badge variant="outline" className={cn("text-xs shrink-0", statusStyles[issue.status])}>
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">{issue.subject}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Send className="w-3 h-3" />{issue.sent_count} sent</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{openRate}% opened</span>
                        <span className="flex items-center gap-1"><MousePointer className="w-3 h-3" />{clickRate}% clicked</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{issue.replied_count} replies</span>
                      </div>
                      {issue.topic_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {issue.topic_tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {issue.conversion_to_lead > 0 && (
                        <p className="text-xs text-primary font-medium">{issue.conversion_to_lead} leads</p>
                      )}
                      {issue.conversion_to_deal > 0 && (
                        <p className="text-xs text-success font-medium">{issue.conversion_to_deal} deals</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {issue.sent_at
                          ? formatDistanceToNow(new Date(issue.sent_at), { addSuffix: true })
                          : formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                      </p>
                    </div>
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

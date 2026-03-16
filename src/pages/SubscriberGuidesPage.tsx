import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriberGuides, useCreateSubscriberGuide, useDeleteSubscriberGuide } from "@/hooks/use-subscriber-guides";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SubscriberGuidesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState<string>("email");
  const { data: guides = [], isLoading } = useSubscriberGuides();
  const createGuide = useCreateSubscriberGuide();
  const deleteGuide = useDeleteSubscriberGuide();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createGuide.mutateAsync({
        name: form.get("name") as string,
        slug: form.get("slug") as string,
        description: (form.get("description") as string) || undefined,
        delivery_type: deliveryType as 'email' | 'redirect',
        file_url: (form.get("file_url") as string) || undefined,
        email_subject: (form.get("email_subject") as string) || undefined,
        email_body: (form.get("email_body") as string) || undefined,
      });
      toast({ title: "Guide created" });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGuide.mutateAsync(id);
      toast({ title: "Guide deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriber Guides</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage guides that are automatically delivered to subscribers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              New Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>Create Guide</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guide_name">Name *</Label>
                <Input id="guide_name" name="name" required placeholder="AI Tools Starter Guide" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guide_slug">Slug * <span className="text-xs text-muted-foreground">(matches guide_requested field)</span></Label>
                <Input id="guide_slug" name="slug" required placeholder="ai-tools-guide" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guide_desc">Description</Label>
                <Textarea id="guide_desc" name="description" rows={2} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Type</Label>
                <Select value={deliveryType} onValueChange={setDeliveryType}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="redirect">Redirect URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guide_url">File/Download URL</Label>
                <Input id="guide_url" name="file_url" placeholder="https://..." className="bg-secondary border-border" />
              </div>
              {deliveryType === "email" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="guide_subject">Email Subject</Label>
                    <Input id="guide_subject" name="email_subject" placeholder="Here's your guide: {{guide_name}}" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guide_body">Email Body</Label>
                    <Textarea id="guide_body" name="email_body" rows={4} placeholder="Hi {{first_name}}, here's your guide..." className="bg-secondary border-border" />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createGuide.isPending}>
                  {createGuide.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Guide
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : guides.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No guides yet. Create one to auto-deliver to subscribers.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Slug</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Type</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Downloads</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Created</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {guides.map((guide) => (
                <TableRow key={guide.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{guide.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{guide.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{guide.delivery_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-foreground">{guide.download_count}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", guide.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground")}>
                      {guide.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{format(new Date(guide.created_at), "MMM d, yyyy")}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(guide.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

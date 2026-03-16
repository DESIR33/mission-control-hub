import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriberGuides, useCreateSubscriberGuide, useUpdateSubscriberGuide, useDeleteSubscriberGuide } from "@/hooks/use-subscriber-guides";
import { useCompanies } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Loader2, Video, Building2, Pencil, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { SubscriberGuide } from "@/types/subscriber";

function useVideoQueueList() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-queue-list", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("video_queue" as any)
        .select("id, title, youtube_video_id")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data as any[]) ?? []) as { id: number; title: string; youtube_video_id: string | null }[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

interface GuideFormProps {
  guide?: SubscriberGuide | null;
  videos: { id: number; title: string }[];
  companies: { id: string; name: string; logo_url?: string | null }[];
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
  submitLabel: string;
}

function GuideForm({ guide, videos, companies, onSubmit, isPending, onCancel, submitLabel }: GuideFormProps) {
  const [deliveryType, setDeliveryType] = useState<string>(guide?.delivery_type ?? "email");
  const [selectedVideoId, setSelectedVideoId] = useState<string>(guide?.video_queue_id ? String(guide.video_queue_id) : "");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(guide?.company_id ?? "");
  const [companyOpen, setCompanyOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSubmit({
      name: form.get("name") as string,
      slug: form.get("slug") as string,
      description: (form.get("description") as string) || null,
      delivery_type: deliveryType as "email" | "redirect",
      file_url: (form.get("file_url") as string) || null,
      email_subject: (form.get("email_subject") as string) || null,
      email_body: (form.get("email_body") as string) || null,
      video_queue_id: selectedVideoId && selectedVideoId !== "none" ? Number(selectedVideoId) : null,
      company_id: selectedCompanyId && selectedCompanyId !== "none" ? selectedCompanyId : null,
      status: (form.get("status") as string) || "active",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="guide_name">Name *</Label>
        <Input id="guide_name" name="name" required defaultValue={guide?.name ?? ""} placeholder="AI Tools Starter Guide" className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guide_slug">Slug * <span className="text-xs text-muted-foreground">(matches guide_requested field)</span></Label>
        <Input id="guide_slug" name="slug" required defaultValue={guide?.slug ?? ""} placeholder="ai-tools-guide" className="bg-secondary border-border" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guide_desc">Description</Label>
        <Textarea id="guide_desc" name="description" rows={2} defaultValue={guide?.description ?? ""} className="bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-muted-foreground" />
          Linked Video
        </Label>
        <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Select a video..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No video</SelectItem>
            {videos.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>{v.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Which video this guide is associated with</p>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          Linked Company
        </Label>
        <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={companyOpen} className="w-full justify-between bg-secondary border-border font-normal">
              {selectedCompanyId && selectedCompanyId !== "none" ? (
                <span className="flex items-center gap-2 truncate">
                  {(() => {
                    const c = companies.find((c) => c.id === selectedCompanyId);
                    if (!c) return "Select a company...";
                    return (
                      <>
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                        ) : (
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        {c.name}
                      </>
                    );
                  })()}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a company...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search companies..." />
              <CommandList>
                <CommandEmpty>No companies found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__none__" onSelect={() => { setSelectedCompanyId(""); setCompanyOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", !selectedCompanyId ? "opacity-100" : "opacity-0")} />
                    <span className="text-muted-foreground">No company</span>
                  </CommandItem>
                  {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedCompanyId(c.id); setCompanyOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", selectedCompanyId === c.id ? "opacity-100" : "opacity-0")} />
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="w-5 h-5 rounded object-contain shrink-0 mr-2" />
                      ) : (
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Which company/brand this guide relates to</p>
      </div>

      <div className="space-y-1.5">
        <Label>Delivery Type</Label>
        <Select value={deliveryType} onValueChange={setDeliveryType}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="redirect">Redirect URL</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guide_url">File/Download URL</Label>
        <Input id="guide_url" name="file_url" defaultValue={guide?.file_url ?? ""} placeholder="https://..." className="bg-secondary border-border" />
      </div>
      {deliveryType === "email" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="guide_subject">Email Subject</Label>
            <Input id="guide_subject" name="email_subject" defaultValue={guide?.email_subject ?? ""} placeholder="Here's your guide: {{guide_name}}" className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guide_body">Email Body</Label>
            <Textarea id="guide_body" name="email_body" rows={4} defaultValue={guide?.email_body ?? ""} placeholder="Hi {{first_name}}, here's your guide..." className="bg-secondary border-border" />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select name="status" defaultValue={guide?.status ?? "active"}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function SubscriberGuidesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<SubscriberGuide | null>(null);
  const { data: guides = [], isLoading } = useSubscriberGuides();
  const { data: companies = [] } = useCompanies();
  const { data: videos = [] } = useVideoQueueList();
  const createGuide = useCreateSubscriberGuide();
  const updateGuide = useUpdateSubscriberGuide();
  const deleteGuide = useDeleteSubscriberGuide();
  const { toast } = useToast();

  const handleCreate = async (data: any) => {
    try {
      await createGuide.mutateAsync(data);
      toast({ title: "Guide created" });
      setCreateOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingGuide) return;
    try {
      await updateGuide.mutateAsync({ id: editingGuide.id, ...data });
      toast({ title: "Guide updated" });
      setEditingGuide(null);
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

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              New Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Guide</DialogTitle>
            </DialogHeader>
            <GuideForm
              videos={videos}
              companies={companies}
              onSubmit={handleCreate}
              isPending={createGuide.isPending}
              onCancel={() => setCreateOpen(false)}
              submitLabel="Create Guide"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGuide} onOpenChange={(open) => { if (!open) setEditingGuide(null); }}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guide</DialogTitle>
          </DialogHeader>
          {editingGuide && (
            <GuideForm
              guide={editingGuide}
              videos={videos}
              companies={companies}
              onSubmit={handleUpdate}
              isPending={updateGuide.isPending}
              onCancel={() => setEditingGuide(null)}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

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
                <TableHead className="text-muted-foreground font-semibold">Video</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Company</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Type</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Downloads</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Created</TableHead>
                <TableHead className="w-[80px]" />
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
                    {guide.video_title ? (
                      <span className="text-sm text-foreground flex items-center gap-1.5 truncate max-w-[180px]">
                        <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {guide.video_title}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {guide.company_name ? (
                      <div className="flex items-center gap-1.5">
                        {guide.company_logo_url ? (
                          <img src={guide.company_logo_url} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm text-foreground truncate max-w-[140px]">{guide.company_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
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
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGuide(guide)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(guide.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSubscriber } from "@/hooks/use-subscribers";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import type { SubscriberSource } from "@/types/subscriber";

interface AddSubscriberDialogProps {
  trigger?: React.ReactNode;
}

export function AddSubscriberDialog({ trigger }: AddSubscriberDialogProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<SubscriberSource>("manual");
  const createSubscriber = useCreateSubscriber();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    try {
      await createSubscriber.mutateAsync({
        email: form.get("email") as string,
        first_name: (form.get("first_name") as string) || undefined,
        last_name: (form.get("last_name") as string) || undefined,
        source,
        source_video_id: (form.get("source_video_id") as string) || undefined,
        source_video_title: (form.get("source_video_title") as string) || undefined,
        guide_requested: (form.get("guide_requested") as string) || undefined,
        city: (form.get("city") as string) || undefined,
        state: (form.get("state") as string) || undefined,
        country: (form.get("country") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
      });
      toast({ title: "Subscriber added" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Subscriber
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subscriber</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sub_email">Email *</Label>
            <Input id="sub_email" name="email" type="email" required placeholder="subscriber@example.com" className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub_first_name">First Name</Label>
              <Input id="sub_first_name" name="first_name" placeholder="John" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub_last_name">Last Name</Label>
              <Input id="sub_last_name" name="last_name" placeholder="Doe" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as SubscriberSource)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="import">Import</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub_video_id">Source Video ID</Label>
              <Input id="sub_video_id" name="source_video_id" placeholder="dQw4w9WgXcQ" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub_video_title">Source Video Title</Label>
              <Input id="sub_video_title" name="source_video_title" placeholder="My Video" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub_guide">Guide Requested</Label>
            <Input id="sub_guide" name="guide_requested" placeholder="ai-tools-guide" className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub_city">City</Label>
              <Input id="sub_city" name="city" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub_state">State</Label>
              <Input id="sub_state" name="state" className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub_country">Country</Label>
              <Input id="sub_country" name="country" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub_notes">Notes</Label>
            <Textarea id="sub_notes" name="notes" rows={2} className="bg-secondary border-border" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createSubscriber.isPending}>
              {createSubscriber.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Subscriber
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

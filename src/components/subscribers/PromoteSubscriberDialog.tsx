import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { usePromoteSubscriber } from "@/hooks/use-subscriber-promotion";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { Subscriber } from "@/types/subscriber";

interface PromoteSubscriberDialogProps {
  subscriber: Subscriber;
  onPromoted?: () => void;
}

export function PromoteSubscriberDialog({ subscriber, onPromoted }: PromoteSubscriberDialogProps) {
  const [open, setOpen] = useState(false);
  const promote = usePromoteSubscriber();
  const { toast } = useToast();

  const handlePromote = async () => {
    try {
      await promote.mutateAsync(subscriber);
      toast({ title: "Subscriber promoted", description: `${subscriber.first_name ?? subscriber.email} has been added as a contact.` });
      setOpen(false);
      onPromoted?.();
    } catch (err: any) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    }
  };

  if (subscriber.promoted_to_contact_id) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-muted-foreground">
        <ArrowUpRight className="w-3.5 h-3.5" />
        Already Promoted
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Promote to Contact
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Promote Subscriber to Contact</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new CRM contact from subscriber data:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {subscriber.first_name ?? "—"} {subscriber.last_name ?? ""}</p>
          <p><span className="text-muted-foreground">Email:</span> {subscriber.email}</p>
          <p><span className="text-muted-foreground">Source:</span> Subscriber ({subscriber.source ?? "website"})</p>
          <p><span className="text-muted-foreground">Status:</span> Lead</p>
          {subscriber.guide_requested && <p><span className="text-muted-foreground">Guide:</span> {subscriber.guide_requested}</p>}
          <p><span className="text-muted-foreground">Engagement:</span> {subscriber.engagement_score} pts</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePromote} disabled={promote.isPending}>
            {promote.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Promote
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

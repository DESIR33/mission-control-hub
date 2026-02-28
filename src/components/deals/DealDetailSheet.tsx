import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, DollarSign, Trash2, User2 } from "lucide-react";
import { useUpdateDeal, useDeleteDeal, type Deal, type DealStage } from "@/hooks/use-deals";
import { useActivities } from "@/hooks/use-contacts";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { useToast } from "@/hooks/use-toast";

export { STAGE_CONFIG };

const STAGE_CONFIG: Record<DealStage, { label: string; color: string }> = {
  prospecting: { label: "Prospecting", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
  qualification: { label: "Qualification", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
  proposal: { label: "Proposal", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300" },
  negotiation: { label: "Negotiation", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
  closed_won: { label: "Closed Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" },
  closed_lost: { label: "Closed Lost", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
};

interface DealDetailSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDetailSheet({ deal, open, onOpenChange }: DealDetailSheetProps) {
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const { toast } = useToast();
  const { data: activities = [] } = useActivities(deal?.id ?? null, "deal");

  if (!deal) return null;

  const cfg = STAGE_CONFIG[deal.stage];

  const handleStageChange = (stage: string) => {
    const closedAt = stage === "closed_won" || stage === "closed_lost" ? new Date().toISOString() : null;
    updateDeal.mutate(
      { id: deal.id, stage, closed_at: closedAt },
      {
        onSuccess: () => toast({ title: `Deal moved to ${STAGE_CONFIG[stage as DealStage]?.label ?? stage}` }),
        onError: (err) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deleteDeal.mutate(deal.id, {
      onSuccess: () => {
        toast({ title: "Deal deleted" });
        onOpenChange(false);
      },
      onError: (err) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{deal.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Stage + Value */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cfg.color}>{cfg.label}</Badge>
            {deal.value != null && (
              <span className="text-lg font-mono font-bold text-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {deal.value.toLocaleString()}
                {deal.currency && <span className="text-xs text-muted-foreground ml-1">{deal.currency}</span>}
              </span>
            )}
          </div>

          {/* Move Stage */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Move to stage</p>
            <Select value={deal.stage} onValueChange={handleStageChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STAGE_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            {deal.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{deal.company.name}</span>
              </div>
            )}
            {deal.contact && (
              <div className="flex items-center gap-2 text-sm">
                <User2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {deal.contact.first_name} {deal.contact.last_name ?? ""}
                  {deal.contact.email && (
                    <span className="text-muted-foreground ml-1">({deal.contact.email})</span>
                  )}
                </span>
              </div>
            )}
            {deal.expected_close_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  Expected close: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
            {deal.closed_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  Closed: {format(new Date(deal.closed_at), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          {deal.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{deal.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Activity Timeline */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Activity</p>
            <ActivityTimeline activities={activities} contactId={deal.id} entityType="deal" />
          </div>

          <Separator />

          {/* Metadata */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Created {format(new Date(deal.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            <p>Updated {format(new Date(deal.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
            onClick={handleDelete}
            disabled={deleteDeal.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteDeal.isPending ? "Deleting..." : "Delete Deal"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

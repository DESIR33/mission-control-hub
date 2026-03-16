import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscriberGuides } from "@/hooks/use-subscriber-guides";
import { useSubscriberGuideAssignments, useAssignGuide, useUnassignGuide } from "@/hooks/use-subscriber-guide-assignments";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SubscriberGuidePickerProps {
  subscriberId: string;
}

export function SubscriberGuidePicker({ subscriberId }: SubscriberGuidePickerProps) {
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const { data: allGuides = [] } = useSubscriberGuides();
  const { data: assignments = [], isLoading } = useSubscriberGuideAssignments(subscriberId);
  const assignGuide = useAssignGuide();
  const unassignGuide = useUnassignGuide();
  const { toast } = useToast();

  const assignedGuideIds = new Set(assignments.map((a) => a.guide_id));
  const availableGuides = allGuides.filter((g) => !assignedGuideIds.has(g.id) && g.status === "active");

  const handleAssign = async () => {
    if (!selectedGuideId) return;
    try {
      await assignGuide.mutateAsync({ subscriberId, guideId: selectedGuideId });
      toast({ title: "Guide linked" });
      setSelectedGuideId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      await unassignGuide.mutateAsync({ id: assignmentId, subscriberId });
      toast({ title: "Guide unlinked" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Guides</h4>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No guides linked yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.guide_name ?? a.guide_id}</p>
                {a.guide_slug && (
                  <p className="text-xs text-muted-foreground">{a.guide_slug}</p>
                )}
              </div>
              {a.downloaded_at && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Downloaded {format(new Date(a.downloaded_at), "MMM d")}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleUnassign(a.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableGuides.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
            <SelectTrigger className="flex-1 bg-secondary border-border text-sm h-8">
              <SelectValue placeholder="Select a guide..." />
            </SelectTrigger>
            <SelectContent>
              {availableGuides.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleAssign} disabled={!selectedGuideId || assignGuide.isPending}>
            {assignGuide.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Link
          </Button>
        </div>
      )}
    </div>
  );
}

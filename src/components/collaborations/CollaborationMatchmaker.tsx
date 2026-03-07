import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Users,
  Plus,
  Loader2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCollaboration } from "@/hooks/use-collaborations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

const COLLAB_FORMATS = [
  { value: "guest", label: "Guest Appearance" },
  { value: "interview", label: "Interview" },
  { value: "collab_video", label: "Challenge / Collab Video" },
  { value: "shoutout", label: "Shoutout" },
  { value: "cross_promo", label: "Cross Promotion" },
  { value: "other", label: "Other" },
];

interface MatchmakerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PotentialCollaborator {
  id: string;
  name: string;
  channelUrl: string | null;
  subscriberCount: number | null;
  niche: string | null;
  suggestedFormat: string;
  source: "contact" | "suggestion";
}

export function CollaborationMatchmaker({ open, onOpenChange }: MatchmakerProps) {
  const { workspaceId } = useWorkspace();
  const createCollab = useCreateCollaboration();

  const [nicheFilter, setNicheFilter] = useState("");
  const [minSubs, setMinSubs] = useState("");
  const [maxSubs, setMaxSubs] = useState("");
  const [collabType, setCollabType] = useState<string>("all");
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch contacts that might have YouTube channel data
  const { data: contacts = [] } = useQuery({
    queryKey: ["matchmaker-contacts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("id, first_name, last_name, email, company_id, social_youtube, social_instagram, social_linkedin, notes")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  // Build potential collaborators from contacts with YouTube channels
  const potentialCollaborators = useMemo((): PotentialCollaborator[] => {
    return contacts
      .filter((c: any) => c.social_youtube)
      .map((c: any) => {
        // Suggest collab format based on notes/context
        let suggestedFormat = "guest";
        const notes = (c.notes ?? "").toLowerCase();
        if (notes.includes("interview")) suggestedFormat = "interview";
        else if (notes.includes("challenge")) suggestedFormat = "collab_video";
        else if (notes.includes("shout")) suggestedFormat = "shoutout";
        else if (notes.includes("cross")) suggestedFormat = "cross_promo";

        return {
          id: c.id,
          name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || "Unknown",
          channelUrl: c.social_youtube,
          subscriberCount: null, // Not tracked on contacts directly
          niche: null,
          suggestedFormat,
          source: "contact" as const,
        };
      });
  }, [contacts]);

  // Apply filters
  const filteredResults = useMemo(() => {
    return potentialCollaborators.filter((c) => {
      if (nicheFilter && c.niche && !c.niche.toLowerCase().includes(nicheFilter.toLowerCase())) {
        return false;
      }
      if (minSubs && c.subscriberCount != null && c.subscriberCount < Number(minSubs)) {
        return false;
      }
      if (maxSubs && c.subscriberCount != null && c.subscriberCount > Number(maxSubs)) {
        return false;
      }
      if (collabType !== "all" && c.suggestedFormat !== collabType) {
        return false;
      }
      // Name search
      if (nicheFilter && !c.niche) {
        return c.name.toLowerCase().includes(nicheFilter.toLowerCase());
      }
      return true;
    });
  }, [potentialCollaborators, nicheFilter, minSubs, maxSubs, collabType]);

  const handleAddToPipeline = async (collab: PotentialCollaborator) => {
    setAddingId(collab.id);
    try {
      await createCollab.mutateAsync({
        creator_name: collab.name,
        channel_url: collab.channelUrl,
        subscriber_count: collab.subscriberCount,
        niche: collab.niche,
        collab_type: collab.suggestedFormat as any,
        status: "prospect",
        contact_id: collab.source === "contact" ? collab.id : null,
      });
      toast.success(`${collab.name} added to pipeline as prospect`);
    } catch (err: any) {
      toast.error("Failed to add to pipeline", { description: err.message });
    } finally {
      setAddingId(null);
    }
  };

  const formatSubs = (count: number | null) => {
    if (count == null) return "Unknown";
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Find Collaborators
          </DialogTitle>
          <DialogDescription>
            Search for potential collaboration partners from your contacts and network.
          </DialogDescription>
        </DialogHeader>

        {/* Search / Filter */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Niche / Name</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={nicheFilter}
                  onChange={(e) => setNicheFilter(e.target.value)}
                  placeholder="Tech, Gaming, Finance..."
                  className="pl-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Collab Type Preference</Label>
              <Select value={collabType} onValueChange={setCollabType}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any type</SelectItem>
                  {COLLAB_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Min Subscribers</Label>
              <Input
                type="number"
                value={minSubs}
                onChange={(e) => setMinSubs(e.target.value)}
                placeholder="0"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Subscribers</Label>
              <Input
                type="number"
                value={maxSubs}
                onChange={(e) => setMaxSubs(e.target.value)}
                placeholder="No limit"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredResults.length} potential collaborator{filteredResults.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No matching collaborators found. Try adjusting your filters or add contacts with YouTube channels.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {filteredResults.map((collab) => (
                <div
                  key={collab.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {collab.name}
                      </h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {COLLAB_FORMATS.find((f) => f.value === collab.suggestedFormat)?.label ?? collab.suggestedFormat}
                      </Badge>
                      {collab.source === "contact" && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Contact
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatSubs(collab.subscriberCount)} subs
                      </span>
                      {collab.niche && <span>{collab.niche}</span>}
                      {collab.channelUrl && (
                        <a
                          href={collab.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Channel
                        </a>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToPipeline(collab)}
                    disabled={addingId === collab.id}
                  >
                    {addingId === collab.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                    )}
                    Add to Pipeline
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

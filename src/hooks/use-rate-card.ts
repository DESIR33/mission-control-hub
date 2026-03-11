import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

export interface RateCardItem {
  id: string;
  workspace_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number;
  is_active: boolean;
}

const DEFAULT_ITEMS: Omit<RateCardItem, "id" | "workspace_id">[] = [
  { category: "video", name: "YouTube Video (0–12 min)", description: "Full walkthrough, real use cases, and honest creator-style breakdown. Includes light content review for accuracy.", price: 275, sort_order: 0, is_active: true },
  { category: "video", name: "YouTube Video (12–24 min)", description: "Extended coverage with deeper dive into product features and use cases.", price: 350, sort_order: 1, is_active: true },
  { category: "video", name: "YouTube Video (24–36 min)", description: "Comprehensive dedicated or integrated video with full product exploration.", price: 425, sort_order: 2, is_active: true },
  { category: "addon", name: "X (Twitter) Post", description: "Cross-platform promotion post on X.", price: 0, sort_order: 3, is_active: true },
  { category: "addon", name: "YouTube Community Post", description: "Post on YouTube Community tab.", price: 0, sort_order: 4, is_active: true },
  { category: "addon", name: "Short-form Clip (Reels/TikTok)", description: "Repurposed short-form clip for Reels or TikTok.", price: 0, sort_order: 5, is_active: true },
  { category: "newsletter", name: "Newsletter Mention", description: "Sponsored mention in upcoming newsletter issue.", price: 50, sort_order: 6, is_active: true },
];

export function useRateCard() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["rate-card-items", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_card_items" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RateCardItem[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const rows = DEFAULT_ITEMS.map((item) => ({ ...item, workspace_id: workspaceId }));
      const { error } = await supabase.from("rate_card_items" as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] });
      toast.success("Rate card initialized with defaults");
    },
  });

  const updateItem = useMutation({
    mutationFn: async (item: Partial<RateCardItem> & { id: string }) => {
      const { id, ...updates } = item;
      const { error } = await supabase.from("rate_card_items" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] });
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<RateCardItem, "id" | "workspace_id">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("rate_card_items" as any).insert({ ...item, workspace_id: workspaceId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] });
      toast.success("Item added");
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_card_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] });
      toast.success("Item removed");
    },
  });

  return {
    items,
    isLoading,
    needsSeed: !isLoading && items.length === 0,
    seedDefaults,
    updateItem,
    addItem,
    deleteItem,
  };
}

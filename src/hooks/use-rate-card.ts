import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
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

export interface RateCardTerm {
  id: string;
  workspace_id: string;
  category: string;
  content: string;
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

const DEFAULT_TERMS: Omit<RateCardTerm, "id" | "workspace_id">[] = [
  { category: "general", content: "Sponsored posts remain live for a minimum of 12 months (typically indefinitely).", sort_order: 0, is_active: true },
  { category: "general", content: "This includes up to 2 rounds of pre-publish edits included. Post-publish changes are not guaranteed.", sort_order: 1, is_active: true },
  { category: "general", content: "Payment is due once the final draft is approved and before publishing. Accepted methods: PayPal, Stripe, or Wise.", sort_order: 2, is_active: true },
  { category: "general", content: "Videos can be scheduled to publish within 12 hours of payment receipt or on a predetermined future date.", sort_order: 3, is_active: true },
  { category: "general", content: "Hustling Labs makes no performance guarantees on views, clicks, or conversions. Promotion is done in good faith.", sort_order: 4, is_active: true },
  { category: "general", content: "All video content remains the intellectual property of Hustling Labs unless otherwise agreed in writing but we're fine if the company wants to run ads using them.", sort_order: 5, is_active: true },
  { category: "general", content: "Sponsorship will be disclosed on the video per FTC and related regulations.", sort_order: 6, is_active: true },
  { category: "affiliate", content: "For affiliate deals, we only work with companies that use one of the following affiliate tracking platforms: Rewardful, Dubb, or Tolt.", sort_order: 7, is_active: true },
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

  const { data: terms = [], isLoading: termsLoading } = useQuery({
    queryKey: ["rate-card-terms", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_card_terms" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RateCardTerm[];
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const itemRows = DEFAULT_ITEMS.map((item) => ({ ...item, workspace_id: workspaceId }));
      const termRows = DEFAULT_TERMS.map((term) => ({ ...term, workspace_id: workspaceId }));
      const [r1, r2] = await Promise.all([
        supabase.from("rate_card_items" as any).insert(itemRows as any),
        supabase.from("rate_card_terms" as any).insert(termRows as any),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["rate-card-terms", workspaceId] });
      toast.success("Rate card initialized with defaults");
    },
  });

  const updateItem = useMutation({
    mutationFn: async (item: Partial<RateCardItem> & { id: string }) => {
      const { id, ...updates } = item;
      const { error } = await supabase.from("rate_card_items" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] }),
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<RateCardItem, "id" | "workspace_id">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("rate_card_items" as any).insert({ ...item, workspace_id: workspaceId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] }); toast.success("Item added"); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_card_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rate-card-items", workspaceId] }); toast.success("Item removed"); },
  });

  const updateTerm = useMutation({
    mutationFn: async (term: Partial<RateCardTerm> & { id: string }) => {
      const { id, ...updates } = term;
      const { error } = await supabase.from("rate_card_terms" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-card-terms", workspaceId] }),
  });

  const addTerm = useMutation({
    mutationFn: async (term: Omit<RateCardTerm, "id" | "workspace_id">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase.from("rate_card_terms" as any).insert({ ...term, workspace_id: workspaceId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rate-card-terms", workspaceId] }); toast.success("Term added"); },
  });

  const deleteTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_card_terms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rate-card-terms", workspaceId] }); toast.success("Term removed"); },
  });

  return {
    items,
    terms,
    isLoading: isLoading || termsLoading,
    needsSeed: !isLoading && !termsLoading && items.length === 0 && terms.length === 0,
    seedDefaults,
    updateItem, addItem, deleteItem,
    updateTerm, addTerm, deleteTerm,
  };
}

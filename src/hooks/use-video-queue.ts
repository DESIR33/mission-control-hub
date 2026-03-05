import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoQueueItem {
  id: string;
  title: string;
  description: string | null;
  status: "idea" | "scripting" | "recording" | "editing" | "scheduled" | "published";
  priority: "low" | "medium" | "high";
  targetPublishDate: string | null;
  platforms: string[];
  isSponsored: boolean;
  company: { id: string; name: string; logo: string | null } | null;
  sponsoringCompany: { id: string; name: string; logo: string | null } | null;
  assignedTo: { firstName: string | null; lastName: string | null } | null;
  checklists: Array<{ id: number; label: string; completed: boolean; sortOrder: number }>;
  notes: string | null;
  youtubeVideoId: string | null;
  scriptContent: string | null;
  productionCost: number | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
}

export interface CreateVideoInput {
  title: string;
  description?: string;
  status?: VideoQueueItem["status"];
  priority?: VideoQueueItem["priority"];
  targetPublishDate?: string | null;
  platforms?: string[];
  isSponsored?: boolean;
  companyId?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  sponsoringCompanyId?: string | null;
  sponsoringCompanyName?: string | null;
  sponsoringCompanyLogo?: string | null;
  checklists?: Array<{ label: string; completed?: boolean }>;
  scriptContent?: string | null;
  productionCost?: number | null;
}

export interface UpdateVideoInput {
  id: string | number;
  title?: string;
  description?: string | null;
  status?: VideoQueueItem["status"];
  priority?: VideoQueueItem["priority"];
  targetPublishDate?: string | null;
  platforms?: string[];
  isSponsored?: boolean;
  companyId?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  sponsoringCompanyId?: string | null;
  sponsoringCompanyName?: string | null;
  sponsoringCompanyLogo?: string | null;
  youtubeVideoId?: string | null;
  scriptContent?: string | null;
  productionCost?: number | null;
}

function mapRow(row: any): VideoQueueItem {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    targetPublishDate: row.scheduled_date ?? null,
    platforms: meta.platforms ?? [],
    isSponsored: meta.isSponsored ?? false,
    company: meta.company ?? null,
    sponsoringCompany: meta.sponsoringCompany ?? null,
    assignedTo: meta.assignedTo ?? null,
    checklists: meta.checklists ?? [],
    notes: row.notes,
    youtubeVideoId: meta.youtubeVideoId ?? null,
    scriptContent: meta.scriptContent ?? null,
    productionCost: typeof meta.productionCost === "number" ? meta.productionCost : null,
    metadata: meta,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    workspace_id: row.workspace_id,
  };
}

export function useVideoQueue() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-queue", workspaceId],
    queryFn: async (): Promise<VideoQueueItem[]> => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!workspaceId,
  });
}

export function useVideoQueueItem(id: number | string | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-queue", workspaceId, id],
    queryFn: async (): Promise<VideoQueueItem | null> => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("*")
        .eq("id", String(id))
        .single();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    enabled: !!workspaceId && !!id,
  });
}

export function useCreateVideo() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVideoInput) => {
      if (!workspaceId) throw new Error("Workspace not ready");

      // Build checklists for metadata (still stored there alongside relational columns)
      const checklists = (input.checklists ?? []).map((c, i) => ({
        id: Date.now() + i,
        label: c.label,
        completed: c.completed ?? false,
        sortOrder: i,
      }));

      // Company display info stored in metadata for easy retrieval
      const metadata: Record<string, unknown> = { checklists };
      if (input.companyId) {
        metadata.company = { id: input.companyId, name: input.companyName ?? "", logo: input.companyLogo ?? null };
      }
      if (input.sponsoringCompanyId) {
        metadata.sponsoringCompany = { id: input.sponsoringCompanyId, name: input.sponsoringCompanyName ?? "", logo: input.sponsoringCompanyLogo ?? null };
      }

      // Store fields that don't have dedicated columns in the metadata JSONB
      metadata.platforms = input.platforms ?? [];
      metadata.isSponsored = input.isSponsored ?? false;
      metadata.companyId = input.companyId ?? null;
      metadata.sponsoringCompanyId = input.sponsoringCompanyId ?? null;
      metadata.scriptContent = input.scriptContent ?? null;
      if (input.productionCost != null) metadata.productionCost = input.productionCost;

      const { error } = await supabase.from("video_queue").insert({
        workspace_id: workspaceId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "idea",
        priority: input.priority ?? "medium",
        scheduled_date: input.targetPublishDate ?? null,
        metadata: metadata as any,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useUpdateVideo() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateVideoInput) => {
      // Fetch existing row to merge metadata
      const { data: existing, error: fetchError } = await supabase
        .from("video_queue")
        .select("metadata")
        .eq("id", String(input.id))
        .single();
      if (fetchError) throw fetchError;

      const existingMeta = (existing?.metadata as Record<string, unknown>) ?? {};
      const update: Record<string, unknown> = {};

      // Direct column updates
      if (input.title !== undefined) update.title = input.title;
      if (input.description !== undefined) update.description = input.description;
      if (input.status !== undefined) update.status = input.status;
      if (input.priority !== undefined) update.priority = input.priority;
      if (input.targetPublishDate !== undefined) update.scheduled_date = input.targetPublishDate;

      // Update metadata for all extended fields (company, sponsors, platforms, etc.)
      const newMeta = { ...existingMeta };
      if (input.youtubeVideoId !== undefined) newMeta.youtubeVideoId = input.youtubeVideoId;
      if (input.scriptContent !== undefined) newMeta.scriptContent = input.scriptContent;
      if (input.productionCost !== undefined) newMeta.productionCost = input.productionCost;
      if (input.platforms !== undefined) newMeta.platforms = input.platforms;
      if (input.isSponsored !== undefined) newMeta.isSponsored = input.isSponsored;

      if (input.companyId !== undefined) {
        newMeta.companyId = input.companyId || null;
        newMeta.company = input.companyId
          ? { id: input.companyId, name: input.companyName ?? "", logo: input.companyLogo ?? null }
          : null;
      }
      if (input.sponsoringCompanyId !== undefined) {
        newMeta.sponsoringCompanyId = input.sponsoringCompanyId || null;
        newMeta.sponsoringCompany = input.sponsoringCompanyId
          ? { id: input.sponsoringCompanyId, name: input.sponsoringCompanyName ?? "", logo: input.sponsoringCompanyLogo ?? null }
          : null;
      }
      update.metadata = newMeta;

      const { error } = await supabase
        .from("video_queue")
        .update(update)
        .eq("id", String(input.id));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useDeleteVideo() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from("video_queue").delete().eq("id", String(id));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useToggleChecklist() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (args: { videoId: string | number; checklistId: number; completed: boolean }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("video_queue")
        .select("metadata")
        .eq("id", String(args.videoId))
        .single();
      if (fetchError) throw fetchError;

      const meta = (existing?.metadata as Record<string, unknown>) ?? {};
      const checklists = (meta.checklists as Array<{ id: number; label: string; completed: boolean; sortOrder: number }>) ?? [];
      const updated = checklists.map((c) =>
        c.id === args.checklistId ? { ...c, completed: args.completed } : c
      );

      const { error } = await supabase
        .from("video_queue")
        .update({ metadata: { ...meta, checklists: updated } } as any)
        .eq("id", String(args.videoId));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useAddChecklist() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (args: { videoId: number | string; label: string }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("video_queue")
        .select("metadata")
        .eq("id", String(args.videoId))
        .single();
      if (fetchError) throw fetchError;

      const meta = (existing?.metadata as Record<string, unknown>) ?? {};
      const checklists = (meta.checklists as Array<{ id: number; label: string; completed: boolean; sortOrder: number }>) ?? [];
      const newItem = {
        id: Date.now(),
        label: args.label,
        completed: false,
        sortOrder: checklists.length,
      };

      const { error } = await supabase
        .from("video_queue")
        .update({ metadata: { ...meta, checklists: [...checklists, newItem] } } as any)
        .eq("id", String(args.videoId));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (args: { videoId: string | number; checklistId: number }) => {
      const { data: existing, error: fetchError } = await supabase
        .from("video_queue")
        .select("metadata")
        .eq("id", String(args.videoId))
        .single();
      if (fetchError) throw fetchError;

      const meta = (existing?.metadata as Record<string, unknown>) ?? {};
      const checklists = (meta.checklists as Array<{ id: number; label: string; completed: boolean; sortOrder: number }>) ?? [];
      const filtered = checklists.filter((c) => c.id !== args.checklistId);

      const { error } = await supabase
        .from("video_queue")
        .update({ metadata: { ...meta, checklists: filtered } } as any)
        .eq("id", String(args.videoId));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

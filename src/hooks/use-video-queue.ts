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
  sponsoringCompanyId?: string | null;
  checklists?: Array<{ label: string; completed?: boolean }>;
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
  sponsoringCompanyId?: string | null;
}

function mapRow(row: any): VideoQueueItem {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    targetPublishDate: row.scheduled_date,
    platforms: meta.platforms ?? [],
    isSponsored: meta.isSponsored ?? false,
    company: meta.company ?? null,
    sponsoringCompany: meta.sponsoringCompany ?? null,
    assignedTo: meta.assignedTo ?? null,
    checklists: meta.checklists ?? [],
    notes: row.notes,
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
      const metadata: Record<string, unknown> = {};
      if (input.platforms) metadata.platforms = input.platforms;
      if (input.isSponsored != null) metadata.isSponsored = input.isSponsored;
      if (input.checklists) metadata.checklists = input.checklists.map((c, i) => ({ id: i + 1, label: c.label, completed: c.completed ?? false, sortOrder: i }));
      const { error } = await supabase.from("video_queue").insert({
        workspace_id: workspaceId!,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "idea",
        priority: input.priority ?? "medium",
        scheduled_date: input.targetPublishDate ?? null,
        metadata,
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
      const update: Record<string, unknown> = {};
      if (input.title !== undefined) update.title = input.title;
      if (input.description !== undefined) update.description = input.description;
      if (input.status !== undefined) update.status = input.status;
      if (input.priority !== undefined) update.priority = input.priority;
      if (input.targetPublishDate !== undefined) update.scheduled_date = input.targetPublishDate;
      const { error } = await supabase
        .from("video_queue")
        .update(update as any)
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
    mutationFn: async (_args: { checklistId: number; completed: boolean }) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useAddChecklist() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (_args: { videoId: number | string; label: string }) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

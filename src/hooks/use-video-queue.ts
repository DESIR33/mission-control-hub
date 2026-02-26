import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface VideoQueueItem {
  id: number;
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
}

export function useVideoQueue() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-queue", workspaceId],
    queryFn: async (): Promise<VideoQueueItem[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("video_queue")
        .select(
          `
          *,
          company:companies!video_queue_company_id_fkey(id, name, logo_url),
          sponsoring_company:companies!video_queue_sponsoring_company_id_fkey(id, name, logo_url),
          video_queue_checklists(id, label, completed, sort_order)
        `
        )
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status as VideoQueueItem["status"],
        priority: row.priority as VideoQueueItem["priority"],
        targetPublishDate: row.target_publish_date,
        platforms: row.platforms ?? [],
        isSponsored: row.is_sponsored,
        company: row.company
          ? { id: row.company.id, name: row.company.name, logo: row.company.logo_url }
          : null,
        sponsoringCompany: row.sponsoring_company
          ? {
              id: row.sponsoring_company.id,
              name: row.sponsoring_company.name,
              logo: row.sponsoring_company.logo_url,
            }
          : null,
        assignedTo: row.assigned_to ? { firstName: null, lastName: null } : null,
        checklists: (row.video_queue_checklists ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((c: any) => ({
            id: c.id,
            label: c.label,
            completed: c.completed,
            sortOrder: c.sort_order,
          })),
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useVideoQueueItem(id: number | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["video-queue", workspaceId, id],
    queryFn: async (): Promise<VideoQueueItem | null> => {
      if (!workspaceId || !id) return null;

      const { data, error } = await supabase
        .from("video_queue")
        .select(
          `
          *,
          company:companies!video_queue_company_id_fkey(id, name, logo_url),
          sponsoring_company:companies!video_queue_sponsoring_company_id_fkey(id, name, logo_url),
          video_queue_checklists(id, label, completed, sort_order)
        `
        )
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status as VideoQueueItem["status"],
        priority: data.priority as VideoQueueItem["priority"],
        targetPublishDate: data.target_publish_date,
        platforms: data.platforms ?? [],
        isSponsored: data.is_sponsored,
        company: data.company
          ? { id: (data.company as any).id, name: (data.company as any).name, logo: (data.company as any).logo_url }
          : null,
        sponsoringCompany: data.sponsoring_company
          ? {
              id: (data.sponsoring_company as any).id,
              name: (data.sponsoring_company as any).name,
              logo: (data.sponsoring_company as any).logo_url,
            }
          : null,
        assignedTo: data.assigned_to ? { firstName: null, lastName: null } : null,
        checklists: ((data.video_queue_checklists as any[]) ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => ({
            id: c.id,
            label: c.label,
            completed: c.completed,
            sortOrder: c.sort_order,
          })),
      };
    },
    enabled: !!workspaceId && !!id,
  });
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

export function useCreateVideo() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVideoInput) => {
      if (!workspaceId) throw new Error("No workspace");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("video_queue")
        .insert({
          workspace_id: workspaceId,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? "idea",
          priority: input.priority ?? "medium",
          target_publish_date: input.targetPublishDate ?? null,
          platforms: input.platforms ?? [],
          is_sponsored: input.isSponsored ?? false,
          company_id: input.companyId ?? null,
          sponsoring_company_id: input.sponsoringCompanyId ?? null,
          assigned_to: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      if (input.checklists && input.checklists.length > 0) {
        const { error: clError } = await supabase
          .from("video_queue_checklists")
          .insert(
            input.checklists.map((c, i) => ({
              video_queue_id: data.id,
              label: c.label,
              completed: c.completed ?? false,
              sort_order: i,
            }))
          );
        if (clError) throw clError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
    },
  });
}

export interface UpdateVideoInput {
  id: number;
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

export function useUpdateVideo() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateVideoInput) => {
      if (!workspaceId) throw new Error("No workspace");

      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.targetPublishDate !== undefined) updates.target_publish_date = input.targetPublishDate;
      if (input.platforms !== undefined) updates.platforms = input.platforms;
      if (input.isSponsored !== undefined) updates.is_sponsored = input.isSponsored;
      if (input.companyId !== undefined) updates.company_id = input.companyId;
      if (input.sponsoringCompanyId !== undefined) updates.sponsoring_company_id = input.sponsoringCompanyId;

      const { data, error } = await supabase
        .from("video_queue")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
    },
  });
}

export function useDeleteVideo() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: number) => {
      if (!workspaceId) throw new Error("No workspace");

      const { error } = await supabase
        .from("video_queue")
        .delete()
        .eq("id", videoId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
    },
  });
}

export function useToggleChecklist() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checklistId, completed }: { checklistId: number; completed: boolean }) => {
      const { error } = await supabase
        .from("video_queue_checklists")
        .update({ completed })
        .eq("id", checklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
    },
  });
}

export function useAddChecklist() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, label }: { videoId: number; label: string }) => {
      const { data: existing } = await supabase
        .from("video_queue_checklists")
        .select("sort_order")
        .eq("video_queue_id", videoId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const { error } = await supabase.from("video_queue_checklists").insert({
        video_queue_id: videoId,
        label,
        sort_order: nextOrder,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
    },
  });
}

export function useDeleteChecklist() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checklistId: number) => {
      const { error } = await supabase
        .from("video_queue_checklists")
        .delete()
        .eq("id", checklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-queue", workspaceId] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// Stub — video_queue table doesn't exist yet.
export function useVideoQueue() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-queue", workspaceId],
    queryFn: async (): Promise<VideoQueueItem[]> => [],
    enabled: !!workspaceId,
  });
}

export function useVideoQueueItem(_id: number | null) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["video-queue", workspaceId, _id],
    queryFn: async (): Promise<VideoQueueItem | null> => null,
    enabled: !!workspaceId && !!_id,
  });
}

export function useCreateVideo() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_input: CreateVideoInput) => null,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useUpdateVideo() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_input: UpdateVideoInput) => null,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useDeleteVideo() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useToggleChecklist() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { checklistId: number; completed: boolean }) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useAddChecklist() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { videoId: number; label: string }) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

export function useDeleteChecklist() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-queue", workspaceId] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";

export interface ThumbnailReference {
  id: string;
  workspace_id: string;
  storage_path: string;
  url: string;
  label: string | null;
  tags: string[];
  source_channel: string | null;
  source_video_url: string | null;
  notes: string | null;
  created_at: string;
}

export function useThumbnailReferences() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["thumbnail-references", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thumbnail_references" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ThumbnailReference[];
    },
    enabled: !!workspaceId,
  });
}

export function useUploadThumbnailReference() {
  const { workspaceId } = useWorkspace();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      label?: string;
      tags?: string[];
      source_channel?: string;
      source_video_url?: string;
      notes?: string;
    }) => {
      const ext = params.file.name.split(".").pop() || "jpg";
      const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("thumbnail-references")
        .upload(path, params.file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("thumbnail-references")
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from("thumbnail_references" as any)
        .insert({
          workspace_id: workspaceId!,
          storage_path: path,
          url: urlData.publicUrl,
          label: params.label || null,
          tags: params.tags || [],
          source_channel: params.source_channel || null,
          source_video_url: params.source_video_url || null,
          notes: params.notes || null,
          created_by: user?.id || null,
        });
      if (dbError) throw dbError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thumbnail-references"] });
      toast.success("Thumbnail reference uploaded");
    },
    onError: (err: any) => {
      toast.error("Upload failed: " + err.message);
    },
  });
}

export function useDeleteThumbnailReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ref: ThumbnailReference) => {
      await supabase.storage.from("thumbnail-references").remove([ref.storage_path]);
      const { error } = await supabase
        .from("thumbnail_references" as any)
        .delete()
        .eq("id", ref.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thumbnail-references"] });
      toast.success("Reference deleted");
    },
    onError: (err: any) => {
      toast.error("Delete failed: " + err.message);
    },
  });
}

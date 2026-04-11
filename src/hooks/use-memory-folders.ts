import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";

const q = (table: string) => (supabase as any).from(table);

export interface MemoryFolder {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryAttachment {
  id: string;
  workspace_id: string;
  memory_id: string | null;
  folder_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string;
}

export function useMemoryFolders() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["memory-folders", workspaceId];

  const { data: folders = [], isLoading: foldersLoading } = useQuery<MemoryFolder[]>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await q("memory_folders")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery<MemoryAttachment[]>({
    queryKey: ["memory-attachments", workspaceId],
    queryFn: async () => {
      const { data, error } = await q("memory_attachments")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const createFolder = useMutation({
    mutationFn: async (input: { name: string; parent_id?: string | null; description?: string; color?: string }) => {
      const { data, error } = await q("memory_folders").insert({
        workspace_id: workspaceId,
        name: input.name,
        parent_id: input.parent_id || null,
        description: input.description || null,
        color: input.color || "#6366f1",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Folder created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await q("memory_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await q("memory_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Folder deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, folderId, memoryId }: { file: File; folderId?: string | null; memoryId?: string | null }) => {
      const path = `${workspaceId}/${folderId || "root"}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("memory-attachments").upload(path, file);
      if (uploadError) throw uploadError;

      const { data, error } = await q("memory_attachments").insert({
        workspace_id: workspaceId,
        folder_id: folderId || null,
        memory_id: memoryId || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory-attachments", workspaceId] });
      toast({ title: "File uploaded" });
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: MemoryAttachment) => {
      await supabase.storage.from("memory-attachments").remove([attachment.file_path]);
      const { error } = await q("memory_attachments").delete().eq("id", attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory-attachments", workspaceId] });
      toast({ title: "File deleted" });
    },
  });

  return {
    folders,
    attachments,
    isLoading: foldersLoading || attachmentsLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFile,
    deleteAttachment,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

// ─── Profile ─────────────────────────────────────────────────────────────────

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<"profiles"> | null;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (fields: { full_name?: string; avatar_url?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ─── Workspace ───────────────────────────────────────────────────────────────

export function useWorkspaceDetails() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["workspace", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId!)
        .single();
      if (error) throw error;
      return data as Tables<"workspaces">;
    },
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (fields: { name?: string; logo_url?: string }) => {
      const { error } = await supabase
        .from("workspaces")
        .update(fields)
        .eq("id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace"] }),
  });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export type MemberRole = "admin" | "operator" | "contributor" | "viewer";

export interface MemberWithProfile {
  id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profile: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

export function useWorkspaceMembers() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for each member
      const userIds = (data ?? []).map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return (data ?? []).map((m) => ({
        ...m,
        role: m.role as MemberRole,
        profile: profileMap.get(m.user_id) ?? null,
      })) as MemberWithProfile[];
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: MemberRole }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["workspace_members", workspaceId] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["workspace_members", workspaceId] }),
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: MemberRole }) => {
      const { error } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspaceId!, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["workspace_members", workspaceId] }),
  });
}

// Look up a user by email (via profiles table)
export function useLookupUserByEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

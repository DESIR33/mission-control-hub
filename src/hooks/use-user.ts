import { useAuth } from "@/hooks/use-auth";

interface InboxUser {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  workspaceId?: string;
}

export function useUser() {
  const { user: authUser, isLoading } = useAuth();

  const user: InboxUser | null = authUser
    ? {
        id: authUser.id,
        email: authUser.email,
        firstName: authUser.user_metadata?.first_name ?? authUser.user_metadata?.full_name?.split(" ")[0] ?? null,
        lastName: authUser.user_metadata?.last_name ?? authUser.user_metadata?.full_name?.split(" ").slice(1).join(" ") ?? null,
        workspaceId: authUser.user_metadata?.workspace_id ?? authUser.id,
      }
    : null;

  return { user, isLoading };
}

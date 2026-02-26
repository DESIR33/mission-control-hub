import { useState, useCallback } from "react";

export type NotificationType =
  | "overdue_task"
  | "deal_stage_change"
  | "new_contact"
  | "ai_proposal_ready";

export interface Notification {
  id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

// Stub implementation — notifications table doesn't exist yet.
// Returns empty state so the sidebar badge and notifications page render without errors.
export function useNotifications() {
  const [notifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markRead = useCallback((_id: string) => {}, []);
  const markAllRead = useCallback(() => {}, []);
  const createNotification = useCallback((_payload: {
    type: NotificationType;
    title: string;
    body?: string;
    entity_type?: string;
    entity_id?: string;
  }) => {}, []);

  return {
    notifications,
    unreadCount,
    isLoading: false,
    markRead,
    markAllRead,
    createNotification,
    isCreating: false,
  };
}

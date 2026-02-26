import { useEffect, useRef, useCallback, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios-config";
import { cn } from "@/lib/utils";
import {
  MailIcon,
  PaperclipIcon,
  StarIcon,
  PinIcon,
  CheckSquareIcon,
  SquareIcon,
  MoreHorizontalIcon,
  Loader2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SwipeActionType = "none" | "archive" | "delete" | "snooze" | "pin" | "read";

interface SwipeGestureSettings {
  enabled: boolean;
  leftAction: SwipeActionType;
  rightAction: SwipeActionType;
}

interface EmailMessage {
  id: string;
  dbId: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  senderEmail: string;
  senderName: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: "low" | "normal" | "high";
  conversationId: string;
  folderId?: number;
  company?: { id: number; name: string; logo?: string };
  contact?: { id: number; firstName: string; lastName: string };
  tags?: Array<{ id: number; name: string; color: string }>;
  isVip?: boolean;
  reminderBadge?: { hasReminder: boolean; isOverdue: boolean; dueAt: string | null };
  opportunity?: {
    confidence: number;
    bucket: "high" | "medium" | "low";
    reasons: string[];
    suggestedActions: Array<"create_deal" | "create_task">;
  };
  aiDraft?: {
    badge: string;
    draftId?: string | null;
    confidence?: number | null;
    threshold?: number | null;
    provenance?: { details?: string; editorNotes?: string } | null;
  } | null;
  pinned?: boolean;
  unreadCount?: number;
  participants?: string[];
  latestTimestamp?: string;
  snippet?: string | null;
  groupBy?: "message" | "conversation";
  priority?: {
    score: number;
    bucket: "high" | "medium" | "low";
    lane?: "focused" | "others";
    contributors?: { senderReputation: number; interactionHistory: number; urgencyCues: number; userBehavior: number };
    focusedReasons?: string[];
  };
}

interface InterpretedInboxFilters {
  search?: string;
  sender?: string;
  to?: string;
  subjectContains?: string;
  participants?: string[];
  keywords?: string[];
  folder?: string;
  unread?: boolean;
  labels?: string[];
  hasAttachments?: boolean;
  dateFrom?: string;
  dateTo?: string;
  assignedOwnerId?: string;
  slaState?: string;
}

interface EmailListProps {
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailMessage) => void;
  selectedFolder: string;
  searchQuery: string;
  interpretedFilters: InterpretedInboxFilters | null;
  filterUnread: boolean;
  selectedTagIds: number[];
  selectedEmails: Set<string>;
  filterVipOnly: boolean;
  filterPinnedOnly: boolean;
  filterHighPriorityOnly: boolean;
  groupBy: "message" | "conversation";
  selectedLane: "all" | "focused" | "others";
  priorityWeights: {
    senderReputation: number;
    interactionHistory: number;
    urgencyCues: number;
    userBehavior: number;
  };
  onToggleSelect: (emailId: string) => void;
  onSelectAll: (emailIds: string[]) => void;
  onTogglePinned: (email: EmailMessage) => void;
  onEmailsChange: (emails: EmailMessage[]) => void;
  onDragEmailStart: (email: EmailMessage, draggedEmailIds: string[], event: DragEvent<HTMLDivElement>) => void;
  onSoftDeleteEmail: (email: EmailMessage) => void;
  onDeleteEmail: (email: EmailMessage) => void;
  onMoveEmail: (email: EmailMessage, destinationFolder: string) => void;
  onSetReadState: (email: EmailMessage, markAsRead: boolean) => void;
  onArchiveEmail: (email: EmailMessage) => void;
  onAssignEmail: (email: EmailMessage) => void;
  onCreateRuleFromEmail: (email: EmailMessage) => void;
  onCreateOpportunityDeal: (email: EmailMessage) => void;
  onCreateOpportunityTask: (email: EmailMessage) => void;
  swipeGestureSettings: SwipeGestureSettings;
  onSwipeAction: (email: EmailMessage, direction: "left" | "right", action: SwipeActionType) => void;
  isMobileCompact?: boolean;
  restoreScrollTop?: number;
  onListScrollPositionChange?: (scrollTop: number) => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function EmailList({
  selectedEmailId,
  onSelectEmail,
  selectedFolder,
  searchQuery,
  interpretedFilters,
  filterUnread,
  selectedTagIds,
  selectedEmails,
  filterVipOnly,
  filterPinnedOnly,
  filterHighPriorityOnly,
  groupBy,
  selectedLane,
  priorityWeights,
  onToggleSelect,
  onSelectAll,
  onTogglePinned,
  onEmailsChange,
  onDragEmailStart,
  onSoftDeleteEmail,
  onDeleteEmail,
  onMoveEmail,
  onSetReadState,
  onArchiveEmail,
  onAssignEmail,
  onCreateRuleFromEmail,
  onCreateOpportunityDeal,
  onCreateOpportunityTask,
  swipeGestureSettings,
  onSwipeAction,
  isMobileCompact,
  restoreScrollTop,
  onListScrollPositionChange,
}: EmailListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number; emailId: string | null }>({
    startX: 0,
    startY: 0,
    emailId: null,
  });

  const params: Record<string, string> = { folder: selectedFolder, groupBy };
  if (searchQuery) params.search = searchQuery;
  if (filterUnread) params.unread = "true";
  if (filterVipOnly) params.vipOnly = "true";
  if (filterPinnedOnly) params.pinnedOnly = "true";
  if (filterHighPriorityOnly) params.highPriorityOnly = "true";
  if (selectedLane !== "all") params.lane = selectedLane;
  if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(",");

  if (interpretedFilters) {
    if (interpretedFilters.sender) params.sender = interpretedFilters.sender;
    if (interpretedFilters.to) params.to = interpretedFilters.to;
    if (interpretedFilters.hasAttachments) params.hasAttachments = "true";
    if (interpretedFilters.dateFrom) params.dateFrom = interpretedFilters.dateFrom;
    if (interpretedFilters.dateTo) params.dateTo = interpretedFilters.dateTo;
    if (interpretedFilters.labels?.length) params.labels = interpretedFilters.labels.join(",");
    if (interpretedFilters.assignedOwnerId) params.assignedOwnerId = interpretedFilters.assignedOwnerId;
    if (interpretedFilters.slaState) params.slaState = interpretedFilters.slaState;
  }

  params.weights = JSON.stringify(priorityWeights);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["/api/inbox/messages", params],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/inbox/messages", { params });
        return Array.isArray(response.data) ? response.data as EmailMessage[] : [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    onEmailsChange(emails);
  }, [emails, onEmailsChange]);

  useEffect(() => {
    if (restoreScrollTop && listRef.current) {
      listRef.current.scrollTop = restoreScrollTop;
    }
  }, [restoreScrollTop]);

  const handleScroll = useCallback(() => {
    if (listRef.current && onListScrollPositionChange) {
      onListScrollPositionChange(listRef.current.scrollTop);
    }
  }, [onListScrollPositionChange]);

  const handleTouchStart = useCallback(
    (emailId: string) => (event: React.TouchEvent) => {
      if (!swipeGestureSettings.enabled) return;
      const touch = event.touches[0];
      if (!touch) return;
      swipeRef.current = { startX: touch.clientX, startY: touch.clientY, emailId };
    },
    [swipeGestureSettings.enabled],
  );

  const handleTouchEnd = useCallback(
    (email: EmailMessage) => (event: React.TouchEvent) => {
      if (!swipeGestureSettings.enabled || swipeRef.current.emailId !== email.id) return;
      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - swipeRef.current.startX;
      const deltaY = Math.abs(touch.clientY - swipeRef.current.startY);

      if (Math.abs(deltaX) > 80 && deltaY < 50) {
        const direction = deltaX < 0 ? "left" : "right";
        const action = direction === "left" ? swipeGestureSettings.leftAction : swipeGestureSettings.rightAction;
        if (action !== "none") {
          onSwipeAction(email, direction, action);
        }
      }

      swipeRef.current = { startX: 0, startY: 0, emailId: null };
    },
    [swipeGestureSettings, onSwipeAction],
  );

  const allEmailIds = emails.map((e) => e.id);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-card px-4 text-center">
        <MailIcon className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">No emails found</p>
        <p className="text-xs text-muted-foreground mt-1">
          {searchQuery ? "Try adjusting your search or filters" : "Your inbox is empty"}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="h-full overflow-y-auto bg-card"
      onScroll={handleScroll}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 border-b border-border bg-card/95 backdrop-blur">
        <button
          onClick={() => onSelectAll(allEmailIds)}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Select all"
        >
          {allEmailIds.length > 0 && allEmailIds.every((id) => selectedEmails.has(id)) ? (
            <CheckSquareIcon className="h-4 w-4 text-primary" />
          ) : (
            <SquareIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <span className="text-xs text-muted-foreground">{emails.length} messages</span>
      </div>

      <div className="divide-y divide-border">
        {emails.map((email) => {
          const isSelected = selectedEmailId === email.id;
          const isChecked = selectedEmails.has(email.id);
          const priorityColor =
            email.priority?.bucket === "high"
              ? "border-l-red-500"
              : email.priority?.bucket === "medium"
                ? "border-l-amber-500"
                : "border-l-transparent";

          return (
            <div
              key={email.id}
              draggable
              onDragStart={(event) => {
                const draggedIds = selectedEmails.size > 0 && selectedEmails.has(email.id)
                  ? Array.from(selectedEmails)
                  : [email.id];
                onDragEmailStart(email, draggedIds, event);
              }}
              onTouchStart={handleTouchStart(email.id)}
              onTouchEnd={handleTouchEnd(email)}
              onClick={() => onSelectEmail(email)}
              className={cn(
                "flex items-start gap-3 px-3 py-3 cursor-pointer transition-all border-l-2",
                priorityColor,
                isSelected
                  ? "bg-primary/5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)]"
                  : "hover:bg-muted/50",
                !email.isRead && "bg-primary/[0.02]",
                isMobileCompact && "min-h-[64px]",
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(email.id);
                }}
                className="mt-0.5 p-0.5 rounded hover:bg-muted transition-colors shrink-0"
              >
                {isChecked ? (
                  <CheckSquareIcon className="h-4 w-4 text-primary" />
                ) : (
                  <SquareIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm truncate", !email.isRead && "font-semibold text-foreground", email.isRead && "text-muted-foreground")}>
                    {email.senderName || email.fromName || email.senderEmail || email.fromEmail}
                  </span>
                  {email.isVip && (
                    <StarIcon className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                  {email.pinned && (
                    <PinIcon className="h-3 w-3 text-primary shrink-0" />
                  )}
                  {email.aiDraft && (
                    <span className="rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                      {email.aiDraft.badge || "AI"}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {formatRelativeDate(email.latestTimestamp || email.receivedAt)}
                  </span>
                </div>

                <p className={cn("text-sm truncate", !email.isRead ? "text-foreground" : "text-muted-foreground")}>
                  {email.subject || "(No subject)"}
                </p>

                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {email.snippet || ""}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {email.hasAttachments && (
                      <PaperclipIcon className="h-3 w-3 text-muted-foreground" />
                    )}
                    {email.importance === "high" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                    {email.unreadCount && email.unreadCount > 1 && (
                      <span className="rounded-full bg-primary/10 text-primary px-1.5 text-[10px] font-medium">
                        {email.unreadCount}
                      </span>
                    )}
                    {email.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded px-1 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {email.opportunity && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        email.opportunity.bucket === "high"
                          ? "bg-emerald-100 text-emerald-700"
                          : email.opportunity.bucket === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600",
                      )}>
                        {Math.round(email.opportunity.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 p-1 rounded hover:bg-muted transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <MoreHorizontalIcon className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onTogglePinned(email)}>
                    {email.pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetReadState(email, !email.isRead)}>
                    {email.isRead ? "Mark as unread" : "Mark as read"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchiveEmail(email)}>Archive</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveEmail(email, "junk")}>Move to junk</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAssignEmail(email)}>Assign owner</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateRuleFromEmail(email)}>Create rule</DropdownMenuItem>
                  {email.opportunity && (
                    <>
                      <DropdownMenuSeparator />
                      {email.opportunity.suggestedActions?.includes("create_deal") && (
                        <DropdownMenuItem onClick={() => onCreateOpportunityDeal(email)}>Create deal</DropdownMenuItem>
                      )}
                      {email.opportunity.suggestedActions?.includes("create_task") && (
                        <DropdownMenuItem onClick={() => onCreateOpportunityTask(email)}>Create task</DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDeleteEmail(email)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}

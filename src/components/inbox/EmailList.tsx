import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MailIcon,
  PaperclipIcon,
  PinIcon,
  Loader2Icon,
  Trash2Icon,
  MailOpenIcon,
  ArchiveIcon,
  FolderIcon,
  AlertCircleIcon,
  CheckSquareIcon,
  XIcon,
  ClockIcon,
} from "lucide-react";
import type { SmartEmail, EmailPriority } from "@/hooks/use-smart-inbox";
import { useDeleteEmail, useMarkRead, useTogglePin, useMoveEmail } from "@/hooks/use-smart-inbox";
import { useSnoozeEmail, getSnoozeOptions } from "@/hooks/use-snooze";
import { EmailCategoryBadge } from "./EmailCategoryBadge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface EmailListProps {
  emails: SmartEmail[];
  isLoading: boolean;
  selectedEmailId: string | null;
  onSelectEmail: (email: SmartEmail) => void;
  searchQuery: string;
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

const priorityColors: Record<EmailPriority, string> = {
  P1: "border-l-red-500",
  P2: "border-l-amber-500",
  P3: "border-l-blue-500",
  P4: "border-l-transparent",
};

const priorityBadgeColors: Record<EmailPriority, string> = {
  P1: "bg-red-500/10 text-red-700",
  P2: "bg-amber-500/10 text-amber-700",
  P3: "bg-blue-500/10 text-blue-700",
  P4: "bg-muted text-muted-foreground",
};

export default function EmailList({
  emails,
  isLoading,
  selectedEmailId,
  onSelectEmail,
  searchQuery,
}: EmailListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const deleteEmail = useDeleteEmail();
  const markRead = useMarkRead();
  const togglePin = useTogglePin();
  const moveEmail = useMoveEmail();
  const snoozeEmail = useSnoozeEmail();
  const snoozeOptions = getSnoozeOptions();

  const toggleSelect = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(emails.map((e) => e.id)));
  }, [emails]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const ids = Array.from(selectedIds);
  const hasSelection = ids.length > 0;

  const bulkAction = (action: () => void) => {
    action();
    clearSelection();
  };

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
          {searchQuery ? "Try adjusting your search" : "This folder is empty"}
        </p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    deleteEmail.mutate([emailId], {
      onSuccess: () => toast.success("Email deleted"),
      onError: () => toast.error("Failed to delete email"),
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-card flex flex-col">
      {/* Header / Bulk action bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur shrink-0">
        {hasSelection ? (
          <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearSelection}>
              <XIcon className="h-3.5 w-3.5 mr-1" />
              {ids.length} selected
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                bulkAction(() =>
                  markRead.mutate({ ids, is_read: true }, { onSuccess: () => toast.success("Marked as read") })
                )
              }
            >
              <MailOpenIcon className="h-3.5 w-3.5 mr-1" />
              Read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                bulkAction(() =>
                  markRead.mutate({ ids, is_read: false }, { onSuccess: () => toast.success("Marked as unread") })
                )
              }
            >
              <MailIcon className="h-3.5 w-3.5 mr-1" />
              Unread
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                bulkAction(() =>
                  moveEmail.mutate({ ids, folder: "archive" }, { onSuccess: () => toast.success("Archived") })
                )
              }
            >
              <ArchiveIcon className="h-3.5 w-3.5 mr-1" />
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                bulkAction(() =>
                  moveEmail.mutate({ ids, folder: "junk" }, { onSuccess: () => toast.success("Junked") })
                )
              }
            >
              <AlertCircleIcon className="h-3.5 w-3.5 mr-1" />
              Junk
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() =>
                bulkAction(() =>
                  moveEmail.mutate({ ids, folder: "trash" }, { onSuccess: () => toast.success(`${ids.length} emails moved to trash`) })
                )
              }
            >
              <Trash2Icon className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <Checkbox
              checked={false}
              onCheckedChange={() => {
                enterSelectionMode();
                selectAll();
              }}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">{emails.length} messages</span>
            {!selectionMode && (
              <button
                onClick={enterSelectionMode}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckSquareIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Email rows */}
      <div className="divide-y divide-border flex-1">
        {emails.map((email) => {
          const isViewing = selectedEmailId === email.id;
          const isChecked = selectedIds.has(email.id);

          return (
            <ContextMenu key={email.id}>
              <ContextMenuTrigger asChild>
                <div
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelect(email.id);
                    } else {
                      onSelectEmail(email);
                    }
                  }}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-3 cursor-pointer transition-all border-l-2 relative",
                    priorityColors[email.priority],
                    isChecked && "bg-primary/10",
                    !isChecked && isViewing && "bg-primary/5",
                    !isChecked && !isViewing && "hover:bg-muted/50",
                    !email.is_read && !isChecked && "bg-primary/[0.02]",
                  )}
                >
                  {/* Checkbox: visible in selection mode or on hover */}
                  <div
                    className={cn(
                      "pt-0.5 shrink-0 transition-all",
                      selectionMode ? "opacity-100 w-5" : "opacity-0 w-0 group-hover:opacity-100 group-hover:w-5"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!selectionMode) enterSelectionMode();
                      toggleSelect(email.id);
                    }}
                  >
                    <Checkbox checked={isChecked} className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm truncate", !email.is_read && "font-semibold text-foreground", email.is_read && "text-muted-foreground")}>
                        {email.from_name || email.from_email}
                      </span>
                      {email.is_pinned && (
                        <PinIcon className="h-3 w-3 text-primary shrink-0" />
                      )}
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0", priorityBadgeColors[email.priority])}>
                        {email.priority}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0 tabular-nums group-hover:mr-7">
                        {formatRelativeDate(email.received_at)}
                      </span>
                    </div>

                    <p className={cn("text-sm truncate", !email.is_read ? "text-foreground" : "text-muted-foreground")}>
                      {email.subject || "(No subject)"}
                    </p>

                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {email.preview}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {email.has_attachments && (
                          <PaperclipIcon className="h-3 w-3 text-muted-foreground" />
                        )}
                        {email.importance === "high" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                        <EmailCategoryBadge category={(email as any).ai_category} />
                        {email.matched_contact && (
                          <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                            CRM
                          </span>
                        )}
                        {email.matched_deal && (
                          <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-700">
                            Deal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover delete button */}
                  <button
                    onClick={(e) => handleDelete(e, email.id)}
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-52">
                {hasSelection && (
                  <>
                    <ContextMenuItem disabled className="text-xs text-muted-foreground">
                      {ids.length} selected
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem
                  onClick={() => {
                    const targetIds = hasSelection ? ids : [email.id];
                    markRead.mutate(
                      { ids: targetIds, is_read: !email.is_read },
                      { onSuccess: () => toast.success(email.is_read ? "Marked as unread" : "Marked as read") }
                    );
                  }}
                >
                  {email.is_read ? (
                    <>
                      <MailIcon className="h-4 w-4 mr-2" />
                      Mark as unread
                    </>
                  ) : (
                    <>
                      <MailOpenIcon className="h-4 w-4 mr-2" />
                      Mark as read
                    </>
                  )}
                </ContextMenuItem>

                <ContextMenuItem
                  onClick={() =>
                    togglePin.mutate(
                      { id: email.id, is_pinned: !email.is_pinned },
                      { onSuccess: () => toast.success(email.is_pinned ? "Unpinned" : "Pinned") }
                    )
                  }
                >
                  <PinIcon className="h-4 w-4 mr-2" />
                  {email.is_pinned ? "Unpin" : "Pin to top"}
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                  onClick={() => {
                    const targetIds = hasSelection ? ids : [email.id];
                    moveEmail.mutate(
                      { ids: targetIds, folder: "archive" },
                      { onSuccess: () => { toast.success("Moved to archive"); clearSelection(); } }
                    );
                  }}
                >
                  <ArchiveIcon className="h-4 w-4 mr-2" />
                  Archive
                </ContextMenuItem>

                <ContextMenuItem
                  onClick={() => {
                    const targetIds = hasSelection ? ids : [email.id];
                    moveEmail.mutate(
                      { ids: targetIds, folder: "junk" },
                      { onSuccess: () => { toast.success("Moved to junk"); clearSelection(); } }
                    );
                  }}
                >
                  <AlertCircleIcon className="h-4 w-4 mr-2" />
                  Mark as junk
                </ContextMenuItem>

                <ContextMenuItem
                  onClick={() => {
                    const targetIds = hasSelection ? ids : [email.id];
                    moveEmail.mutate(
                      { ids: targetIds, folder: "inbox" },
                      { onSuccess: () => { toast.success("Moved to inbox"); clearSelection(); } }
                    );
                  }}
                >
                  <FolderIcon className="h-4 w-4 mr-2" />
                  Move to inbox
                </ContextMenuItem>

                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Snooze
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    {snoozeOptions.map((opt) => (
                      <ContextMenuItem
                        key={opt.label}
                        onClick={() => {
                          snoozeEmail.mutate(
                            { id: email.id, snoozed_until: opt.getValue().toISOString() },
                            { onSuccess: () => toast.success(`Snoozed: ${opt.label}`) }
                          );
                        }}
                      >
                        {opt.label}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>

                <ContextMenuSeparator />

                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    const targetIds = hasSelection ? ids : [email.id];
                    deleteEmail.mutate(targetIds, {
                      onSuccess: () => { toast.success(`${targetIds.length} email(s) deleted`); clearSelection(); },
                      onError: () => toast.error("Failed to delete"),
                    });
                  }}
                >
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MailIcon,
  ReplyIcon,
  ForwardIcon,
  Trash2Icon,
  ArchiveIcon,
  PinIcon,
  PaperclipIcon,
  Loader2Icon,
  MaximizeIcon,
  MinimizeIcon,
  StarIcon,
  WandSparklesIcon,
  ExternalLinkIcon,
  CalendarIcon,
} from "lucide-react";

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

interface InboxPlaybook {
  id: number;
  name: string;
  description: string | null;
  actions: Array<{ id: number; actionType: string; actionOrder: number }>;
}

interface EmailPreviewProps {
  email: EmailMessage | null;
  playbooks: InboxPlaybook[];
  onRunPlaybook: (playbookId: number, emailIds: string[]) => void;
  isRunningPlaybook: boolean;
  onClose: () => void;
  isReadingMode: boolean;
  onToggleReadingMode: () => void;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onTogglePinned: (email: EmailMessage) => void;
}

export default function EmailPreview({
  email,
  playbooks,
  onRunPlaybook,
  isRunningPlaybook,
  onClose,
  isReadingMode,
  onToggleReadingMode,
  onReply,
  onForward,
  onDelete,
  onTogglePinned,
}: EmailPreviewProps) {
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>("");

  const { data: emailBody, isLoading: bodyLoading } = useQuery({
    queryKey: ["/api/inbox/messages", email?.id, "body"],
    queryFn: async () => {
      const response = await axios.get(`/api/inbox/messages/${email!.id}/body`);
      return response.data as { body: string; bodyPreview?: string; attachments?: Array<{ name: string; contentType: string; size: number }> };
    },
    enabled: Boolean(email?.id),
  });

  if (!email) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-card px-8 text-center">
        <div className="rounded-2xl bg-muted/30 p-8">
          <MailIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">Select an email to view</p>
          <p className="text-xs text-muted-foreground mt-1">Choose a message from the list to read it here</p>
        </div>
      </div>
    );
  }

  const senderDisplay = email.senderName || email.fromName || email.senderEmail || email.fromEmail;
  const senderEmailDisplay = email.senderEmail || email.fromEmail;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={onReply} title="Reply" aria-label="Reply">
            <ReplyIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onForward} title="Forward" aria-label="Forward">
            <ForwardIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onTogglePinned(email)} title={email.pinned ? "Unpin" : "Pin"} aria-label={email.pinned ? "Unpin" : "Pin"}>
            <PinIcon className={cn("h-4 w-4", email.pinned && "text-primary fill-primary")} />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Delete" aria-label="Delete">
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          {playbooks.length > 0 && (
            <div className="flex items-center gap-1">
              <Select
                value={selectedPlaybookId}
                onValueChange={setSelectedPlaybookId}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Playbook" />
                </SelectTrigger>
                <SelectContent>
                  {playbooks.map((pb) => (
                    <SelectItem key={pb.id} value={String(pb.id)}>{pb.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedPlaybookId || isRunningPlaybook}
                onClick={() => onRunPlaybook(Number(selectedPlaybookId), [email.id])}
                className="h-8 text-xs"
                aria-label="Run playbook"
              >
                {isRunningPlaybook ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <WandSparklesIcon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={onToggleReadingMode} title={isReadingMode ? "Exit reading mode" : "Reading mode"} aria-label={isReadingMode ? "Exit reading mode" : "Reading mode"}>
            {isReadingMode ? <MinimizeIcon className="h-4 w-4" /> : <MaximizeIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Subject */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground leading-snug">{email.subject || "(No subject)"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {email.importance === "high" && (
              <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">High importance</span>
            )}
            {email.isVip && (
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                <StarIcon className="h-3 w-3 fill-amber-500" />VIP
              </span>
            )}
            {email.priority && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                email.priority.bucket === "high" ? "bg-red-100 text-red-700"
                  : email.priority.bucket === "medium" ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600",
              )}>
                {email.priority.bucket} priority
              </span>
            )}
            {email.aiDraft && (
              <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-medium">
                {email.aiDraft.badge || "AI Draft available"}
              </span>
            )}
            {email.tags?.map((tag) => (
              <span
                key={tag.id}
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        {/* Sender info */}
        <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {email.company?.logo ? (
              <img src={email.company.logo} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-primary">
                {senderDisplay.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{senderDisplay}</p>
              {email.company && (
                <span className="text-xs text-muted-foreground">({email.company.name})</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{senderEmailDisplay}</p>
            <div className="flex items-center gap-2 mt-1">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(email.receivedAt).toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {email.contact && (
              <p className="text-xs text-primary mt-1">
                Contact: {email.contact.firstName} {email.contact.lastName}
              </p>
            )}
          </div>
        </div>

        {/* Opportunity signal */}
        {email.opportunity && (
          <div className={cn(
            "rounded-xl border p-3 space-y-2",
            email.opportunity.bucket === "high"
              ? "border-emerald-200 bg-emerald-50"
              : email.opportunity.bucket === "medium"
                ? "border-amber-200 bg-amber-50"
                : "border-border bg-muted/20",
          )}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Opportunity Signal</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                email.opportunity.bucket === "high" ? "bg-emerald-200 text-emerald-800"
                  : email.opportunity.bucket === "medium" ? "bg-amber-200 text-amber-800"
                    : "bg-slate-200 text-slate-700",
              )}>
                {Math.round(email.opportunity.confidence * 100)}% confidence
              </span>
            </div>
            {email.opportunity.reasons.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {email.opportunity.reasons.map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Reminder badge */}
        {email.reminderBadge?.hasReminder && (
          <div className={cn(
            "rounded-xl border p-3 text-xs",
            email.reminderBadge.isOverdue
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}>
            {email.reminderBadge.isOverdue ? "Overdue reminder" : "Reminder set"}
            {email.reminderBadge.dueAt && (
              <span className="ml-1">· Due {new Date(email.reminderBadge.dueAt).toLocaleDateString()}</span>
            )}
          </div>
        )}

        {/* Email body */}
        <div className="border-t border-border pt-4">
          {bodyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : emailBody?.body ? (
            <div
              className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: emailBody.body }}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{email.snippet || "No content available"}</p>
          )}
        </div>

        {/* Attachments */}
        {emailBody?.attachments && emailBody.attachments.length > 0 && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <PaperclipIcon className="h-3.5 w-3.5" />
              {emailBody.attachments.length} attachment{emailBody.attachments.length > 1 ? "s" : ""}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {emailBody.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                  <PaperclipIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{att.name}</span>
                  <span className="text-muted-foreground shrink-0">{Math.ceil(att.size / 1024)} KB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

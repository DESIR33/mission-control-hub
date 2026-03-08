import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MailIcon,
  ReplyIcon,
  ForwardIcon,
  Trash2Icon,
  ArchiveIcon,
  PinIcon,
  PaperclipIcon,
  Loader2Icon,
  CalendarIcon,
} from "lucide-react";
import { AiEmailDrafter } from "@/components/inbox/AiEmailDrafter";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import type { SmartEmail } from "@/hooks/use-smart-inbox";

interface EmailPreviewProps {
  email: SmartEmail | null;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onTogglePinned: () => void;
}

export default function EmailPreview({
  email,
  onReply,
  onForward,
  onDelete,
  onArchive,
  onTogglePinned,
}: EmailPreviewProps) {
  const outlookSend = useOutlookSend();
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

  const senderDisplay = email.from_name || email.from_email;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={onReply} title="Reply">
            <ReplyIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onForward} title="Forward">
            <ForwardIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onTogglePinned} title={email.is_pinned ? "Unpin" : "Pin"}>
            <PinIcon className={cn("h-4 w-4", email.is_pinned && "text-primary fill-primary")} />
          </Button>
          <Button size="sm" variant="ghost" onClick={onArchive} title="Archive">
            <ArchiveIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Delete">
            <Trash2Icon className="h-4 w-4" />
          </Button>
          {email && (
            <AiEmailDrafter
              email={email}
              onSendDraft={(body) => {
                outlookSend.mutate({
                  reply_to_message_id: email.message_id,
                  body_html: body.replace(/\n/g, "<br>"),
                });
              }}
              isSending={outlookSend.isPending}
            />
          )}
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Subject */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground leading-snug">{email.subject || "(No subject)"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {email.importance === "high" && (
              <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">High importance</span>
            )}
            {email.labels.map((label) => (
              <span key={label} className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Sender info */}
        <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {senderDisplay.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{senderDisplay}</p>
            <p className="text-xs text-muted-foreground">{email.from_email}</p>
            <div className="flex items-center gap-2 mt-1">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(email.received_at).toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {email.matched_contact && (
              <p className="text-xs text-primary mt-1">
                Contact: {email.matched_contact.first_name} {email.matched_contact.last_name}
              </p>
            )}
            {email.matched_deal && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Deal: {email.matched_deal.title} ({email.matched_deal.stage})
              </p>
            )}
          </div>
        </div>

        {/* Email body */}
        <div className="border-t border-border pt-4">
          {email.body_html ? (
            <div
              className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {email.preview || "No content available"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

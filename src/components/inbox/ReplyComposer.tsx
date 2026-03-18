import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SendIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListIcon,
  ListOrderedIcon,
  LinkIcon,
  ImageIcon,
  PaperclipIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { useOutlookSend } from "@/hooks/use-smart-inbox";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import type { SmartEmail } from "@/hooks/use-smart-inbox";
import { toast } from "sonner";

interface ReplyComposerProps {
  email: SmartEmail;
  mode: "reply" | "forward";
  quotedText?: string;
  onClose: () => void;
  onSent?: () => void;
}

interface Attachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export function ReplyComposer({ email, mode, quotedText, onClose, onSent }: ReplyComposerProps) {
  const { workspaceId } = useWorkspace();
  const outlookSend = useOutlookSend();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showCcBcc, setShowCcBcc] = useState(false);
  const [to, setTo] = useState(mode === "reply" ? email.from_email : "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    mode === "reply" ? `Re: ${email.subject}` : `Fwd: ${email.subject}`
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Focus editor on mount
  useEffect(() => {
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        // If there's quoted text, set it
        if (quotedText) {
          const safeQuoted = DOMPurify.sanitize(quotedText.replace(/\n/g, "<br>"), { FORBID_TAGS: ['script', 'style'] });
          editorRef.current.innerHTML = `<p><br></p><blockquote style="border-left: 2px solid hsl(var(--border)); padding-left: 12px; margin-left: 0; color: hsl(var(--muted-foreground));">${safeQuoted}</blockquote>`;
          // Place cursor at the beginning
          const range = document.createRange();
          const sel = window.getSelection();
          const firstP = editorRef.current.querySelector("p");
          if (firstP && sel) {
            range.setStart(firstP, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    }, 100);
  }, [quotedText]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleFormat = useCallback((format: string) => {
    switch (format) {
      case "bold": execCommand("bold"); break;
      case "italic": execCommand("italic"); break;
      case "underline": execCommand("underline"); break;
      case "strikethrough": execCommand("strikeThrough"); break;
      case "unorderedList": execCommand("insertUnorderedList"); break;
      case "orderedList": execCommand("insertOrderedList"); break;
      case "link": {
        const url = prompt("Enter URL:");
        if (url) execCommand("createLink", url);
        break;
      }
    }
  }, [execCommand]);

  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, []);

  const handleImageInsert = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        execCommand("insertImage", reader.result as string);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [execCommand]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const generateAiDraft = useCallback(async () => {
    if (!workspaceId) return;
    setIsGeneratingAi(true);
    try {
      const contactContext = email.matched_contact
        ? `\nCRM Contact: ${email.matched_contact.first_name} ${email.matched_contact.last_name || ""}`
        : "";
      const dealContext = email.matched_deal
        ? `\nActive Deal: ${email.matched_deal.title} (${email.matched_deal.stage})`
        : "";

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          workspace_id: workspaceId,
          session_id: crypto.randomUUID(),
          message: `Draft a professional reply to this email. Be concise, warm, and direct. Start directly with the reply content — no meta text like "Here's a draft".${contactContext}${dealContext}\n\nFrom: ${email.from_name}\nSubject: ${email.subject}\nBody: ${email.body_html?.replace(/<[^>]*>/g, "").slice(0, 1000) || email.preview}\n\nReturn ONLY the reply text.`,
          skip_tools: true,
        },
      });
      if (error) throw error;
      if (data?.response && editorRef.current) {
        const rawHtml = data.response.replace(/\n/g, "<br>");
        const safeHtml = DOMPurify.sanitize(rawHtml, { FORBID_TAGS: ['script', 'style'] });
        editorRef.current.innerHTML = `<p>${safeHtml}</p>`;
      }
    } catch {
      toast.error("Failed to generate AI draft");
    } finally {
      setIsGeneratingAi(false);
    }
  }, [workspaceId, email]);

  const handleSend = useCallback(async () => {
    if (!editorRef.current) return;
    const bodyHtml = editorRef.current.innerHTML;
    if (!bodyHtml.trim() || bodyHtml === "<p><br></p>") {
      toast.error("Please write a reply before sending");
      return;
    }

    if (mode === "forward" && !to.trim()) {
      toast.error("Recipient required");
      return;
    }

    setIsSending(true);
    try {
      if (mode === "reply") {
        await outlookSend.mutateAsync({
          reply_to_message_id: email.message_id,
          body_html: bodyHtml,
        });
      } else {
        await outlookSend.mutateAsync({
          forward_to: to.trim(),
          subject,
          body_html: `${bodyHtml}<br><br>--- Forwarded message ---<br>${email.body_html || email.preview || ""}`,
        });
      }
      toast.success(mode === "reply" ? "Reply sent" : "Email forwarded");
      onSent?.();
      onClose();
    } catch (err: any) {
      toast.error(`Send failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  }, [mode, to, subject, email, outlookSend, onClose, onSent]);

  // ⌘+Enter to send
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
    // Formatting shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case "b": e.preventDefault(); handleFormat("bold"); break;
        case "i": e.preventDefault(); handleFormat("italic"); break;
        case "u": e.preventDefault(); handleFormat("underline"); break;
      }
    }
  }, [handleSend, handleFormat]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const toolbarButtons = [
    { icon: BoldIcon, action: "bold", label: "Bold (⌘B)" },
    { icon: ItalicIcon, action: "italic", label: "Italic (⌘I)" },
    { icon: UnderlineIcon, action: "underline", label: "Underline (⌘U)" },
    { icon: StrikethroughIcon, action: "strikethrough", label: "Strikethrough" },
    null, // separator
    { icon: ListIcon, action: "unorderedList", label: "Bullet list" },
    { icon: ListOrderedIcon, action: "orderedList", label: "Numbered list" },
    { icon: LinkIcon, action: "link", label: "Insert link" },
  ];

  return (
    <div className="border-t-2 border-primary/20 bg-card" onKeyDown={handleKeyDown}>
      {/* Header: To / CC / BCC */}
      <div className="px-4 pt-3 pb-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">
            {mode === "reply" ? "To" : "To"}
          </span>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={email.from_email}
            className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
            readOnly={mode === "reply"}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-5 px-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCcBcc(!showCcBcc)}
          >
            {showCcBcc ? <ChevronUpIcon className="h-3 w-3" /> : <>Cc/Bcc <ChevronDownIcon className="h-3 w-3 ml-0.5" /></>}
          </Button>
        </div>

        {showCcBcc && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">Cc</span>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">Bcc</span>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              />
            </div>
          </>
        )}

        {mode === "forward" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">Subj</span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
            />
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          "min-h-[120px] max-h-[280px] overflow-y-auto px-4 py-3",
          "text-sm text-foreground outline-none",
          "prose prose-sm max-w-none",
          "focus:outline-none",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
          "[&_a]:text-primary [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:list-decimal [&_ol]:pl-5",
        )}
        data-placeholder="Write your reply..."
        style={{
          minHeight: "120px",
        }}
      />

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1 text-xs"
            >
              <PaperclipIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground max-w-[120px] truncate">{att.name}</span>
              <span className="text-muted-foreground">({formatSize(att.size)})</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-muted-foreground hover:text-foreground ml-0.5"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar + Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        {/* Formatting toolbar */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-0.5">
            {toolbarButtons.map((btn, i) =>
              btn === null ? (
                <Separator key={i} orientation="vertical" className="h-5 mx-1" />
              ) : (
                <Tooltip key={btn.action}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleFormat(btn.action)}
                    >
                      <btn.icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{btn.label}</TooltipContent>
                </Tooltip>
              )
            )}

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Image insert */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Insert image</TooltipContent>
            </Tooltip>

            {/* File attach */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PaperclipIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Attach file</TooltipContent>
            </Tooltip>

            {/* AI Draft */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={generateAiDraft}
                  disabled={isGeneratingAi}
                >
                  {isGeneratingAi ? (
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">AI draft</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Send / Discard */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onClose}
          >
            <Trash2Icon className="h-3.5 w-3.5 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SendIcon className="h-3.5 w-3.5" />
            )}
            Send
            <kbd className="hidden sm:inline text-[9px] opacity-60 ml-1">⌘↵</kbd>
          </Button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileAttach}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageInsert}
      />

      {/* Empty content placeholder style */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
}

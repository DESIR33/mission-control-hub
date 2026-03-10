import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useIntegrations } from "@/hooks/use-integrations";
import {
  useSmartInbox,
  useInboxStats,
  useMarkRead,
  useTogglePin,
  useMoveEmail,
  useDeleteEmail,
  useSyncOutlook,
  useOutlookSend,
  useOutlookAuthUrl,
  type SmartEmail,
} from "@/hooks/use-smart-inbox";
import { useClassifyEmails } from "@/hooks/use-email-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  InboxIcon,
  RefreshCwIcon,
  SearchIcon,
  PlusIcon,
  Loader2Icon,
  MailIcon,
  SendIcon,
  LinkIcon,
  SparklesIcon,
  LayoutGridIcon,
  ListIcon,
  CommandIcon,
} from "lucide-react";
import FolderSidebar from "@/components/inbox/FolderSidebar";
import EmailList from "@/components/inbox/EmailList";
import EmailPreview from "@/components/inbox/EmailPreview";
import { SmartInboxSidebar } from "@/components/inbox/SmartInboxSidebar";
import { EmailSequencesContent } from "@/pages/EmailSequencesPage";
import { InboxKanbanView } from "@/components/inbox/InboxKanbanView";
import { SplitInboxTabs, filterBySplit, type SplitCategory } from "@/components/inbox/SplitInboxTabs";
import { InboxCommandBar } from "@/components/inbox/InboxCommandBar";
import { UndoSendToast } from "@/components/inbox/UndoSendToast";
import { ScheduleSendMenu } from "@/components/inbox/ScheduleSendMenu";
import { SnoozeMenu } from "@/components/inbox/SnoozeMenu";
import { AskAiSearch } from "@/components/inbox/AskAiSearch";
import { SnippetsWithVariables } from "@/components/inbox/SnippetsWithVariables";
import { MassArchiveDialog } from "@/components/inbox/MassArchiveDialog";
import { ShareAvailabilityButton } from "@/components/inbox/ShareAvailabilityButton";
import { SmartSendSuggestion } from "@/components/inbox/SmartSendSuggestion";
import { toast as sonnerToast } from "sonner";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";

export default function InboxPage() {
  const { toast } = useToast();
  useInboxRealtime();
  const { data: integrations = [] } = useIntegrations();
  const outlookIntegration = integrations.find((i) => i.integration_key === "ms_outlook" && i.enabled);

  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SmartEmail | null>(null);
  const [splitTab, setSplitTab] = useState<SplitCategory>("all");

  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snoozeDialogEmailId, setSnoozeDialogEmailId] = useState<string | null>(null);

  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Undo send state
  const [undoSendVisible, setUndoSendVisible] = useState(false);
  const [pendingSend, setPendingSend] = useState<{ to: string; subject: string; body_html: string } | null>(null);
  const undoRef = useRef(false);

  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  const [mobileShowPreview, setMobileShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const { data: emails = [], isLoading } = useSmartInbox(selectedFolder, searchQuery);
  const { data: stats } = useInboxStats();
  const syncOutlook = useSyncOutlook();
  const markRead = useMarkRead();
  const togglePin = useTogglePin();
  const moveEmail = useMoveEmail();
  const deleteEmailMut = useDeleteEmail();
  const outlookSend = useOutlookSend();
  const outlookAuth = useOutlookAuthUrl();
  const classifyEmails = useClassifyEmails();

  // Apply split inbox filter
  const filteredEmails = filterBySplit(emails, splitTab);

  const handleSelectEmail = useCallback((email: SmartEmail) => {
    setSelectedEmail(email);
    if (isMobileViewport) setMobileShowPreview(true);
    if (!email.is_read) {
      markRead.mutate({ ids: [email.id], is_read: true });
    }
  }, [isMobileViewport, markRead]);

  const handleSync = useCallback(() => {
    if (!outlookIntegration) {
      toast({ title: "Outlook not connected", description: "Connect Microsoft Outlook in Settings → Integrations first.", variant: "destructive" });
      return;
    }
    syncOutlook.mutate(selectedFolder, {
      onSuccess: (data) => {
        toast({ title: "Sync complete", description: `Fetched ${data.fetched} emails, synced ${data.upserted}.` });
      },
      onError: (error) => {
        toast({ title: "Sync failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      },
    });
  }, [outlookIntegration, syncOutlook, selectedFolder, toast]);

  const selectNextEmail = useCallback((currentEmailId: string) => {
    const currentIndex = filteredEmails.findIndex(e => e.id === currentEmailId);
    if (currentIndex === -1) {
      setSelectedEmail(null);
      return;
    }
    const nextEmail = filteredEmails[currentIndex + 1] || filteredEmails[currentIndex - 1] || null;
    setSelectedEmail(nextEmail);
  }, [filteredEmails]);

  const handleDelete = useCallback(() => {
    if (!selectedEmail) return;
    const emailToDeleteId = selectedEmail.id;
    if (selectedFolder === "trash") {
      deleteEmailMut.mutate([emailToDeleteId], {
        onSuccess: () => {
          toast({ title: "Email permanently deleted" });
          selectNextEmail(emailToDeleteId);
          setDeleteDialogOpen(false);
        },
      });
    } else {
      moveEmail.mutate({ ids: [emailToDeleteId], folder: "trash" }, {
        onSuccess: () => {
          toast({ title: "Email moved to trash" });
          selectNextEmail(emailToDeleteId);
          setDeleteDialogOpen(false);
        },
      });
    }
  }, [selectedEmail, selectedFolder, deleteEmailMut, moveEmail, toast, selectNextEmail]);

  const handleArchive = useCallback(() => {
    if (!selectedEmail) return;
    const emailToArchiveId = selectedEmail.id;
    moveEmail.mutate({ ids: [emailToArchiveId], folder: "archive" }, {
      onSuccess: () => {
        toast({ title: "Email archived" });
        selectNextEmail(emailToArchiveId);
      },
    });
  }, [selectedEmail, moveEmail, toast, selectNextEmail]);

  const handleTogglePinned = useCallback(() => {
    if (!selectedEmail) return;
    togglePin.mutate({ id: selectedEmail.id, is_pinned: !selectedEmail.is_pinned }, {
      onSuccess: () => {
        setSelectedEmail((prev) => prev ? { ...prev, is_pinned: !prev.is_pinned } : null);
      },
    });
  }, [selectedEmail, togglePin]);

  // Undo send flow
  const initiateUndoSend = useCallback((payload: { to: string; subject: string; body_html: string }) => {
    undoRef.current = false;
    setPendingSend(payload);
    setUndoSendVisible(true);
  }, []);

  const handleUndoExpire = useCallback(async () => {
    setUndoSendVisible(false);
    if (undoRef.current || !pendingSend) {
      setPendingSend(null);
      return;
    }
    try {
      await outlookSend.mutateAsync(pendingSend);
      sonnerToast.success("Email sent");
    } catch (err: any) {
      sonnerToast.error(`Send failed: ${err.message}`);
    }
    setPendingSend(null);
  }, [pendingSend, outlookSend]);

  const handleUndoCancel = useCallback(() => {
    undoRef.current = true;
    setUndoSendVisible(false);
    setPendingSend(null);
    sonnerToast.info("Send cancelled");
  }, []);

  const handleComposeSend = useCallback(async () => {
    if (!composeTo.trim()) {
      toast({ title: "Recipient required", variant: "destructive" });
      return;
    }
    initiateUndoSend({
      to: composeTo,
      subject: composeSubject,
      body_html: composeBody.replace(/\n/g, "<br>"),
    });
    setComposeOpen(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
  }, [composeTo, composeSubject, composeBody, toast, initiateUndoSend]);

  const handleScheduleSend = useCallback(async (date: Date) => {
    if (!composeTo.trim()) {
      toast({ title: "Recipient required", variant: "destructive" });
      return;
    }
    // For now, use setTimeout-based scheduling (client-side)
    const delay = date.getTime() - Date.now();
    if (delay <= 0) {
      toast({ title: "Scheduled time must be in the future", variant: "destructive" });
      return;
    }
    sonnerToast.success(`Email scheduled for ${date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`);
    const payload = {
      to: composeTo,
      subject: composeSubject,
      body_html: composeBody.replace(/\n/g, "<br>"),
    };
    setComposeOpen(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");

    setTimeout(async () => {
      try {
        await outlookSend.mutateAsync(payload);
        sonnerToast.success("Scheduled email sent!");
      } catch (err: any) {
        sonnerToast.error(`Scheduled send failed: ${err.message}`);
      }
    }, delay);
  }, [composeTo, composeSubject, composeBody, outlookSend, toast]);

  const handleReplySend = useCallback(async () => {
    if (!selectedEmail) return;
    initiateUndoSend({
      to: selectedEmail.from_email,
      subject: `Re: ${selectedEmail.subject}`,
      body_html: replyBody.replace(/\n/g, "<br>"),
    });
    // Actually use reply_to_message_id
    undoRef.current = false;
    setPendingSend(null);
    setUndoSendVisible(false);
    try {
      await outlookSend.mutateAsync({
        reply_to_message_id: selectedEmail.message_id,
        body_html: replyBody.replace(/\n/g, "<br>"),
      });
      sonnerToast.success("Reply sent");
    } catch (err: any) {
      sonnerToast.error(`Reply failed: ${err.message}`);
    }
    setReplyOpen(false);
    setReplyBody("");
  }, [selectedEmail, replyBody, outlookSend, initiateUndoSend]);

  const handleForwardSend = useCallback(async () => {
    if (!forwardTo.trim()) {
      toast({ title: "Recipient required", variant: "destructive" });
      return;
    }
    try {
      await outlookSend.mutateAsync({
        forward_to: forwardTo,
        subject: `Fwd: ${selectedEmail?.subject || ""}`,
        body_html: `${forwardBody.replace(/\n/g, "<br>")}<br><br>--- Forwarded message ---<br>${selectedEmail?.body_html || selectedEmail?.preview || ""}`,
      });
      sonnerToast.success("Email forwarded");
      setForwardOpen(false);
      setForwardTo("");
      setForwardBody("");
    } catch (err: any) {
      sonnerToast.error(`Forward failed: ${err.message}`);
    }
  }, [forwardTo, forwardBody, selectedEmail, outlookSend, toast]);

  const handleMarkRead = useCallback(() => {
    if (selectedEmail) markRead.mutate({ ids: [selectedEmail.id], is_read: true });
  }, [selectedEmail, markRead]);

  const handleMarkUnread = useCallback(() => {
    if (selectedEmail) markRead.mutate({ ids: [selectedEmail.id], is_read: false });
  }, [selectedEmail, markRead]);

  const handleMoveToJunk = useCallback(() => {
    if (selectedEmail) {
      moveEmail.mutate({ ids: [selectedEmail.id], folder: "junk" }, {
        onSuccess: () => {
          sonnerToast.success("Moved to junk");
          selectNextEmail(selectedEmail.id);
        },
      });
    }
  }, [selectedEmail, moveEmail, selectNextEmail]);

  const handleMoveToInbox = useCallback(() => {
    if (selectedEmail) {
      moveEmail.mutate({ ids: [selectedEmail.id], folder: "inbox" }, {
        onSuccess: () => sonnerToast.success("Moved to inbox"),
      });
    }
  }, [selectedEmail, moveEmail]);

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    document.title = "Inbox | Desmily CRM";
  }, []);

  // Show sequences page if selected
  if (selectedFolder === "sequences") {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] pb-20 sm:pb-0">
        <header className="flex-shrink-0 px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <InboxIcon className="h-5 w-5" />
              Inbox
            </h1>
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-48 shrink-0 hidden md:block">
            <FolderSidebar selectedFolder={selectedFolder} onSelectFolder={setSelectedFolder} />
          </div>
          <div className="flex-1 overflow-auto p-4">
            <EmailSequencesContent />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: show preview or list
  if (isMobileViewport && mobileShowPreview && selectedEmail) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] pb-20">
        <header className="flex-shrink-0 px-4 py-2 border-b border-border bg-card">
          <Button variant="ghost" size="sm" onClick={() => setMobileShowPreview(false)}>
            ← Back
          </Button>
        </header>
        <div className="flex-1 overflow-hidden">
          <EmailPreview
            email={selectedEmail}
            onReply={(quotedText) => {
              if (quotedText) {
                setReplyBody(`\n\n> ${quotedText.replace(/\n/g, "\n> ")}\n\n`);
              }
              setReplyOpen(true);
            }}
            onForward={() => setForwardOpen(true)}
            onDelete={() => setDeleteDialogOpen(true)}
            onArchive={handleArchive}
            onTogglePinned={handleTogglePinned}
          />
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete email?</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedFolder === "trash" ? "This will permanently delete the email." : "This will move the email to trash."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader><DialogTitle>Reply</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">To: {selectedEmail.from_email}</p>
              <Textarea placeholder="Your reply..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={6} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
              <Button onClick={handleReplySend} disabled={outlookSend.isPending}>
                {outlookSend.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader><DialogTitle>Forward</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>To</Label><Input value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="recipient@example.com" /></div>
              <Textarea placeholder="Add a comment..." value={forwardBody} onChange={(e) => setForwardBody(e.target.value)} rows={4} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setForwardOpen(false)}>Cancel</Button>
              <Button onClick={handleForwardSend} disabled={outlookSend.isPending}>
                {outlookSend.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
                Forward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] pb-20 sm:pb-0">
      {/* Command Bar (Cmd+K) */}
      <InboxCommandBar
        onCompose={() => setComposeOpen(true)}
        onReply={() => setReplyOpen(true)}
        onForward={() => setForwardOpen(true)}
        onArchive={handleArchive}
        onDelete={() => setDeleteDialogOpen(true)}
        onTogglePin={handleTogglePinned}
        onMarkRead={handleMarkRead}
        onMarkUnread={handleMarkUnread}
        onSnooze={() => selectedEmail && setSnoozeDialogEmailId(selectedEmail.id)}
        onSync={handleSync}
        onClassify={() => classifyEmails.mutate()}
        onMoveToJunk={handleMoveToJunk}
        onMoveToInbox={handleMoveToInbox}
        onFocusSearch={handleFocusSearch}
        hasSelectedEmail={!!selectedEmail}
      />

      {/* Undo Send Toast */}
      <UndoSendToast
        visible={undoSendVisible}
        onUndo={handleUndoCancel}
        onExpire={handleUndoExpire}
      />

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold flex items-center gap-2 text-foreground shrink-0">
            <InboxIcon className="h-5 w-5" />
            Inbox
          </h1>

          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{stats?.unread ?? 0}</strong> unread</span>
          </div>

          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search emails... (press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground hidden sm:flex"
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                document.dispatchEvent(event);
              }}
            >
              <CommandIcon className="h-3 w-3" />
              <kbd className="text-[10px] bg-muted px-1 rounded">⌘K</kbd>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
              className="gap-1.5"
            >
              {viewMode === "list" ? <LayoutGridIcon className="h-3.5 w-3.5" /> : <ListIcon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{viewMode === "list" ? "Kanban" : "List"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => classifyEmails.mutate()}
              disabled={classifyEmails.isPending}
              className="gap-1.5"
            >
              {classifyEmails.isPending ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SparklesIcon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Classify</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncOutlook.isPending}
              className="gap-1.5"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${syncOutlook.isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </Button>
            <MassArchiveDialog emails={filteredEmails} />
            <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
              <PlusIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compose</span>
            </Button>
          </div>
        </div>

        {!outlookIntegration && (
          <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 flex items-center justify-between">
            <span>
              <MailIcon className="inline h-3.5 w-3.5 mr-1.5" />
              Microsoft Outlook is not connected. Connect your email account to enable syncing.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-3 gap-1.5 text-xs"
              disabled={outlookAuth.isPending}
              onClick={() => {
                outlookAuth.mutate(undefined, {
                  onSuccess: (data) => {
                    window.open(data.url, "_blank");
                  },
                  onError: (err) => {
                    toast({
                      title: "Failed to start authorization",
                      description: err instanceof Error ? err.message : "Unknown error",
                      variant: "destructive",
                    });
                  },
                });
              }}
            >
              <LinkIcon className="h-3 w-3" />
              Authorize Outlook
            </Button>
          </div>
        )}
      </header>

      {/* Split Inbox Tabs */}
      {selectedFolder === "inbox" && (
        <SplitInboxTabs emails={emails} activeTab={splitTab} onTabChange={setSplitTab} />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder sidebar - hidden on mobile */}
        <div className="w-48 shrink-0 hidden md:block">
          <FolderSidebar selectedFolder={selectedFolder} onSelectFolder={(f) => { setSelectedFolder(f); setSplitTab("all"); }} />
        </div>

        {/* Mobile folder tabs */}
        <div className="md:hidden flex-shrink-0 border-b border-border bg-card overflow-x-auto scrollbar-hide" style={{ display: isMobileViewport ? undefined : "none" }}>
        </div>

        {isMobileViewport ? (
          <div className="flex-1 overflow-hidden">
            <EmailList
              emails={filteredEmails}
              isLoading={isLoading}
              selectedEmailId={selectedEmail?.id ?? null}
              onSelectEmail={handleSelectEmail}
              searchQuery={searchQuery}
            />
          </div>
        ) : viewMode === "kanban" ? (
          <div className="flex-1 overflow-hidden p-3">
            <InboxKanbanView
              emails={filteredEmails}
              onSelectEmail={handleSelectEmail}
              selectedEmailId={selectedEmail?.id ?? null}
            />
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={35} minSize={25}>
              <EmailList
                emails={filteredEmails}
                isLoading={isLoading}
                selectedEmailId={selectedEmail?.id ?? null}
                onSelectEmail={handleSelectEmail}
                searchQuery={searchQuery}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} minSize={30}>
              <EmailPreview
                email={selectedEmail}
                onReply={(quotedText) => {
                  if (quotedText) {
                    setReplyBody(`\n\n> ${quotedText.replace(/\n/g, "\n> ")}\n\n`);
                  }
                  setReplyOpen(true);
                }}
                onForward={() => setForwardOpen(true)}
                onDelete={() => setDeleteDialogOpen(true)}
                onArchive={handleArchive}
                onTogglePinned={handleTogglePinned}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={20} minSize={15}>
              <SmartInboxSidebar email={selectedEmail} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Compose dialog with Undo Send + Schedule Send + Snippets */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>To *</Label><Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" /></div>
            {composeTo.trim() && <SmartSendSuggestion recipientEmail={composeTo.trim()} />}
            <div><Label>Subject</Label><Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" /></div>
            <div><Label>Body</Label><Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={8} placeholder="Write your email..." /></div>
            <SnippetsWithVariables onInsert={(text) => setComposeBody((prev) => prev + "\n" + text)} />
            <ShareAvailabilityButton onInsert={(text) => setComposeBody((prev) => prev + "\n" + text)} />
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <ScheduleSendMenu onSchedule={handleScheduleSend} disabled={!composeTo.trim()} />
            <Button onClick={handleComposeSend} disabled={outlookSend.isPending}>
              {outlookSend.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Reply to {selectedEmail?.from_name || selectedEmail?.from_email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Re: {selectedEmail?.subject}</p>
            <Textarea placeholder="Your reply..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={6} />
            <SnippetsWithVariables onInsert={(text) => setReplyBody((prev) => prev + "\n" + text)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
            <Button onClick={handleReplySend} disabled={outlookSend.isPending}>
              {outlookSend.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward dialog */}
      <Dialog open={forwardOpen} onOpenChange={setForwardOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Forward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>To</Label><Input value={forwardTo} onChange={(e) => setForwardTo(e.target.value)} placeholder="recipient@example.com" /></div>
            <Textarea placeholder="Add a comment..." value={forwardBody} onChange={(e) => setForwardBody(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardOpen(false)}>Cancel</Button>
            <Button onClick={handleForwardSend} disabled={outlookSend.isPending}>
              {outlookSend.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
              Forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedFolder === "trash" ? "This will permanently delete the email." : "This will move the email to trash."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

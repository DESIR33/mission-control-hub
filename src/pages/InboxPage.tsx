import { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import FolderSidebar from "@/components/inbox/FolderSidebar";
import EmailList from "@/components/inbox/EmailList";
import EmailPreview from "@/components/inbox/EmailPreview";
import { SmartInboxSidebar } from "@/components/inbox/SmartInboxSidebar";
import { EmailSequencesContent } from "@/pages/EmailSequencesPage";

export default function InboxPage() {
  const { toast } = useToast();
  const { data: integrations = [] } = useIntegrations();
  const outlookIntegration = integrations.find((i) => i.integration_key === "ms_outlook" && i.enabled);

  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<SmartEmail | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardBody, setForwardBody] = useState("");

  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  const [mobileShowPreview, setMobileShowPreview] = useState(false);

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

  const handleDelete = useCallback(() => {
    if (!selectedEmail) return;
    if (selectedFolder === "trash") {
      deleteEmailMut.mutate([selectedEmail.id], {
        onSuccess: () => {
          toast({ title: "Email permanently deleted" });
          setSelectedEmail(null);
          setDeleteDialogOpen(false);
        },
      });
    } else {
      moveEmail.mutate({ ids: [selectedEmail.id], folder: "trash" }, {
        onSuccess: () => {
          toast({ title: "Email moved to trash" });
          setSelectedEmail(null);
          setDeleteDialogOpen(false);
        },
      });
    }
  }, [selectedEmail, selectedFolder, deleteEmailMut, moveEmail, toast]);

  const handleArchive = useCallback(() => {
    if (!selectedEmail) return;
    moveEmail.mutate({ ids: [selectedEmail.id], folder: "archive" }, {
      onSuccess: () => {
        toast({ title: "Email archived" });
        setSelectedEmail(null);
      },
    });
  }, [selectedEmail, moveEmail, toast]);

  const handleTogglePinned = useCallback(() => {
    if (!selectedEmail) return;
    togglePin.mutate({ id: selectedEmail.id, is_pinned: !selectedEmail.is_pinned }, {
      onSuccess: () => {
        setSelectedEmail((prev) => prev ? { ...prev, is_pinned: !prev.is_pinned } : null);
      },
    });
  }, [selectedEmail, togglePin]);

  const handleComposeSend = useCallback(async () => {
    if (!composeTo.trim()) {
      toast({ title: "Recipient required", variant: "destructive" });
      return;
    }
    try {
      await outlookSend.mutateAsync({
        to: composeTo,
        subject: composeSubject,
        body_html: composeBody.replace(/\n/g, "<br>"),
      });
      toast({ title: "Email sent" });
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    }
  }, [composeTo, composeSubject, composeBody, outlookSend, toast]);

  const handleReplySend = useCallback(async () => {
    if (!selectedEmail) return;
    try {
      await outlookSend.mutateAsync({
        reply_to_message_id: selectedEmail.message_id,
        body_html: replyBody.replace(/\n/g, "<br>"),
      });
      toast({ title: "Reply sent" });
      setReplyOpen(false);
      setReplyBody("");
    } catch (err: any) {
      toast({ title: "Reply failed", description: err.message, variant: "destructive" });
    }
  }, [selectedEmail, replyBody, outlookSend, toast]);

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
      toast({ title: "Email forwarded" });
      setForwardOpen(false);
      setForwardTo("");
      setForwardBody("");
    } catch (err: any) {
      toast({ title: "Forward failed", description: err.message, variant: "destructive" });
    }
  }, [forwardTo, forwardBody, selectedEmail, outlookSend, toast]);

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
            onReply={() => setReplyOpen(true)}
            onForward={() => setForwardOpen(true)}
            onDelete={() => setDeleteDialogOpen(true)}
            onArchive={handleArchive}
            onTogglePinned={handleTogglePinned}
          />
        </div>

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

        {/* Reply dialog */}
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
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] pb-20 sm:pb-0">
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
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder sidebar - hidden on mobile */}
        <div className="w-48 shrink-0 hidden md:block">
          <FolderSidebar selectedFolder={selectedFolder} onSelectFolder={setSelectedFolder} />
        </div>

        {/* Mobile folder tabs */}
        <div className="md:hidden flex-shrink-0 border-b border-border bg-card overflow-x-auto scrollbar-hide" style={{ display: isMobileViewport ? undefined : "none" }}>
          {/* Handled via folder sidebar on desktop */}
        </div>

        {isMobileViewport ? (
          <div className="flex-1 overflow-hidden">
            <EmailList
              emails={emails}
              isLoading={isLoading}
              selectedEmailId={selectedEmail?.id ?? null}
              onSelectEmail={handleSelectEmail}
              searchQuery={searchQuery}
            />
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={35} minSize={25}>
              <EmailList
                emails={emails}
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
                onReply={() => setReplyOpen(true)}
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

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>To *</Label><Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" /></div>
            <div><Label>Subject</Label><Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" /></div>
            <div><Label>Body</Label><Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={8} placeholder="Write your email..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
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

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  MailIcon,
  ReplyIcon,
  ForwardIcon,
  ArchiveIcon,
  Trash2Icon,
  PinIcon,
  ClockIcon,
  SearchIcon,
  PlusIcon,
  RefreshCwIcon,
  MailOpenIcon,
  SparklesIcon,
  SendIcon,
  AlertCircleIcon,
  InboxIcon,
} from "lucide-react";

interface InboxCommandBarProps {
  onCompose: () => void;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onSnooze: () => void;
  onSync: () => void;
  onClassify: () => void;
  onMoveToJunk: () => void;
  onMoveToInbox: () => void;
  onFocusSearch: () => void;
  hasSelectedEmail: boolean;
}

export function InboxCommandBar({
  onCompose,
  onReply,
  onForward,
  onArchive,
  onDelete,
  onTogglePin,
  onMarkRead,
  onMarkUnread,
  onSnooze,
  onSync,
  onClassify,
  onMoveToJunk,
  onMoveToInbox,
  onFocusSearch,
  hasSelectedEmail,
}: InboxCommandBarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K to open command bar
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      // Don't trigger shortcuts while typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      // Single-key shortcuts
      switch (e.key) {
        case "c":
          e.preventDefault();
          onCompose();
          break;
        case "r":
          if (hasSelectedEmail) { e.preventDefault(); onReply(); }
          break;
        case "f":
          if (hasSelectedEmail) { e.preventDefault(); onForward(); }
          break;
        case "e":
          if (hasSelectedEmail) { e.preventDefault(); onArchive(); }
          break;
        case "#":
        case "Backspace":
          if (e.key === "#" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
            if (hasSelectedEmail) { e.preventDefault(); onDelete(); }
          }
          break;
        case "p":
          if (hasSelectedEmail) { e.preventDefault(); onTogglePin(); }
          break;
        case "h":
          if (hasSelectedEmail) { e.preventDefault(); onSnooze(); }
          break;
        case "/":
          e.preventDefault();
          onFocusSearch();
          break;
        case "!":
          if (hasSelectedEmail) { e.preventDefault(); onMoveToJunk(); }
          break;
      }

      // Shift shortcuts
      if (e.shiftKey) {
        switch (e.key) {
          case "I":
          case "U":
            if (hasSelectedEmail) { e.preventDefault(); e.key === "I" ? onMarkRead() : onMarkUnread(); }
            break;
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [hasSelectedEmail, onCompose, onReply, onForward, onArchive, onDelete, onTogglePin, onSnooze, onFocusSearch, onMoveToJunk, onMarkRead, onMarkUnread]);

  const exec = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Compose">
          <CommandItem onSelect={() => exec(onCompose)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Email
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {hasSelectedEmail && (
          <CommandGroup heading="Email Actions">
            <CommandItem onSelect={() => exec(onReply)}>
              <ReplyIcon className="mr-2 h-4 w-4" />
              Reply
              <CommandShortcut>R</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onForward)}>
              <ForwardIcon className="mr-2 h-4 w-4" />
              Forward
              <CommandShortcut>F</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onArchive)}>
              <ArchiveIcon className="mr-2 h-4 w-4" />
              Archive
              <CommandShortcut>E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onDelete)}>
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete
              <CommandShortcut>#</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onTogglePin)}>
              <PinIcon className="mr-2 h-4 w-4" />
              Toggle Pin
              <CommandShortcut>P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onSnooze)}>
              <ClockIcon className="mr-2 h-4 w-4" />
              Snooze
              <CommandShortcut>H</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onMarkRead)}>
              <MailOpenIcon className="mr-2 h-4 w-4" />
              Mark as Read
              <CommandShortcut>⇧I</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onMarkUnread)}>
              <MailIcon className="mr-2 h-4 w-4" />
              Mark as Unread
              <CommandShortcut>⇧U</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onMoveToJunk)}>
              <AlertCircleIcon className="mr-2 h-4 w-4" />
              Report Junk
              <CommandShortcut>!</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => exec(onMoveToInbox)}>
              <InboxIcon className="mr-2 h-4 w-4" />
              Move to Inbox
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Tools">
          <CommandItem onSelect={() => exec(onFocusSearch)}>
            <SearchIcon className="mr-2 h-4 w-4" />
            Search
            <CommandShortcut>/</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => exec(onSync)}>
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Sync Outlook
          </CommandItem>
          <CommandItem onSelect={() => exec(onClassify)}>
            <SparklesIcon className="mr-2 h-4 w-4" />
            AI Classify Emails
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

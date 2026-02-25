import { useState, useCallback, useEffect } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  ArchiveIcon,
  Trash2Icon,
  ReplyIcon,
  ForwardIcon,
  PinIcon,
  MailIcon,
  SearchIcon,
  TagIcon,
  BookmarkIcon,
  StarIcon,
  RefreshCwIcon,
  BotIcon,
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
  pinned?: boolean;
  [key: string]: any;
}

interface InboxCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmail: EmailMessage | null;
  selectedThreadEmails: EmailMessage[];
  workspaceContextKey: string;
}

export default function InboxCommandPalette({
  open,
  onOpenChange,
  selectedEmail,
  selectedThreadEmails,
  workspaceContextKey,
}: InboxCommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
            }}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span>Search emails</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
            }}
          >
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            <span>Sync inbox</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
            }}
          >
            <MailIcon className="mr-2 h-4 w-4" />
            <span>Compose new email</span>
          </CommandItem>
        </CommandGroup>

        {selectedEmail && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Selected Email">
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                }}
              >
                <ReplyIcon className="mr-2 h-4 w-4" />
                <span>Reply</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                }}
              >
                <ForwardIcon className="mr-2 h-4 w-4" />
                <span>Forward</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                }}
              >
                <ArchiveIcon className="mr-2 h-4 w-4" />
                <span>Archive</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                }}
              >
                <PinIcon className="mr-2 h-4 w-4" />
                <span>{selectedEmail.pinned ? "Unpin" : "Pin"}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                }}
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Automation">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
            }}
          >
            <BotIcon className="mr-2 h-4 w-4" />
            <span>Run automations</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
            }}
          >
            <TagIcon className="mr-2 h-4 w-4" />
            <span>Manage tags</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

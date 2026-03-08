import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { MemoryPanel } from "@/components/chat/MemoryPanel";
import { useChat } from "@/hooks/use-chat";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export default function ChatPage() {
  const chat = useChat();
  const [showMemory, setShowMemory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const isMobile = useIsMobile();

  const sidebar = (
    <ChatSidebar
      sessions={chat.sessions}
      currentSessionId={chat.sessionId}
      onSelectSession={(id) => {
        chat.loadSession(id);
        setShowSidebar(false);
      }}
      onNewSession={() => {
        chat.newSession();
        setShowSidebar(false);
      }}
      onDeleteSession={chat.deleteSession}
      onRenameSession={chat.renameSession}
    />
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {!isMobile && sidebar}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SheetTitle className="sr-only">Chat Sessions</SheetTitle>
                  {sidebar}
                </SheetContent>
              </Sheet>
            )}
            <h2 className="text-sm font-medium text-muted-foreground">AI Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMemory(!showMemory)}
          >
            {showMemory ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
            <span className="ml-1 text-xs hidden sm:inline">Memory</span>
          </Button>
        </div>
        <ChatMessages messages={chat.messages} isLoading={chat.isLoading} />
        <ChatInput onSend={chat.sendMessage} isLoading={chat.isLoading} />
      </div>

      {showMemory && !isMobile && (
        <MemoryPanel
          memoriesUsed={chat.memoriesUsed}
          toolsCalled={chat.toolsCalled}
          onClose={() => setShowMemory(false)}
        />
      )}
    </div>
  );
}


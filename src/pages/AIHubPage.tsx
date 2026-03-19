import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Brain, Bot, BookOpen, Sparkles, Image, Activity } from "lucide-react";

// Chat components
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { MemoryPanel } from "@/components/chat/MemoryPanel";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

// AI Bridge (Proposals) content
import { AiBridgeContent } from "@/components/ai-hub/AiBridgeContent";

// Agent Hub content
import { AgentHubContent } from "@/components/ai-hub/AgentHubContent";

// Memory content
import { MemoryContent } from "@/components/ai-hub/MemoryContent";

// Flux Training content
import { FluxTrainingContent } from "@/components/ai-hub/FluxTrainingContent";

// Thumbnail Lab
import { ThumbnailLab } from "@/components/command-center/ThumbnailLab";
import { AssistantActivityFeed } from "@/components/assistant/AssistantActivityFeed";

function ChatContent() {
  const chat = useChat();
  const [showMemory, setShowMemory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const isMobile = useIsMobile();

  const sidebar = (
    <ChatSidebar
      sessions={chat.sessions}
      currentSessionId={chat.sessionId}
      onSelectSession={(id) => { chat.loadSession(id); setShowSidebar(false); }}
      onNewSession={() => { chat.newSession(); setShowSidebar(false); }}
    />
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden border border-border rounded-lg">
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
          <Button variant="ghost" size="sm" onClick={() => setShowMemory(!showMemory)}>
            {showMemory ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
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

const VALID_TABS = new Set(["chat", "proposals", "agents", "memory", "training", "thumbnails", "assistant"]);

export default function AIHubPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const activeTab = tab && VALID_TABS.has(tab) ? tab : null;

  if (!activeTab) {
    return <Navigate to="/ai/chat" replace />;
  }

  const updateTab = (v: string) => {
    navigate(`/ai/${v}`, { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">AI Hub</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Chat, proposals, agents, and memory management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={updateTab}>
        <TabsList className="overflow-x-auto flex-nowrap scrollbar-hide w-full justify-start">
          <TabsTrigger value="chat" className="flex-shrink-0 gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="proposals" className="flex-shrink-0 gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Proposals
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex-shrink-0 gap-1.5">
            <Bot className="h-3.5 w-3.5" /> Agents
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex-shrink-0 gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Memory
          </TabsTrigger>
          <TabsTrigger value="training" className="flex-shrink-0 gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Training
          </TabsTrigger>
          <TabsTrigger value="thumbnails" className="flex-shrink-0 gap-1.5">
            <Image className="h-3.5 w-3.5" /> Thumbnails
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex-shrink-0 gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ChatContent />
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          <AiBridgeContent />
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          <AgentHubContent />
        </TabsContent>

        <TabsContent value="memory" className="mt-4">
          <MemoryContent />
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <FluxTrainingContent />
        </TabsContent>

        <TabsContent value="thumbnails" className="mt-4">
          <ThumbnailLab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

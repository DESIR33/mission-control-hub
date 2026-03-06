import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentSentiment } from "../CommentSentiment";
import { CommentInbox } from "../CommentInbox";

export function CommentHubSection() {
  return (
    <Tabs defaultValue="sentiment" className="space-y-4">
      <TabsList>
        <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        <TabsTrigger value="inbox">Comment Inbox</TabsTrigger>
      </TabsList>
      <TabsContent value="sentiment"><CommentSentiment /></TabsContent>
      <TabsContent value="inbox"><CommentInbox /></TabsContent>
    </Tabs>
  );
}

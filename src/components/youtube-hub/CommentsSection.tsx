import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommentsFullContent } from "@/components/youtube-hub/CommentsFullContent";
import { CommentIntelligence } from "@/components/command-center/sections/CommentIntelligence";

export function CommentsSection() {
  return (
    <Tabs defaultValue="comments">
      <TabsList>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="intel">Comment Intel</TabsTrigger>
      </TabsList>
      <TabsContent value="comments">
        <CommentsFullContent />
      </TabsContent>
      <TabsContent value="intel">
        <CommentIntelligence />
      </TabsContent>
    </Tabs>
  );
}

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadThumbnailSection } from "@/components/command-center/sections/UploadThumbnailSection";
import { PlaylistOptimizer } from "@/components/command-center";

export function UploadPlaylistsSection() {
  return (
    <Tabs defaultValue="upload">
      <TabsList>
        <TabsTrigger value="upload">Upload & Thumbnails</TabsTrigger>
        <TabsTrigger value="playlists">Playlists</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <UploadThumbnailSection />
      </TabsContent>
      <TabsContent value="playlists">
        <PlaylistOptimizer />
      </TabsContent>
    </Tabs>
  );
}

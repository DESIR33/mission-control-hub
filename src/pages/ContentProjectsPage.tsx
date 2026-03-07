import { useSearchParams } from "react-router-dom";
import { Film } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoQueuePage from "@/pages/VideoQueuePage";
import ProjectsPage from "@/pages/ProjectsPage";

export default function ContentProjectsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "content";

  const updateTab = (v: string) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", v);
    window.history.replaceState({}, "", `?${sp.toString()}`);
  };

  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" />
            Content & Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your content pipeline and project tasks
          </p>
        </div>

        <Tabs defaultValue={initialTab} onValueChange={updateTab}>
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-0">
            <VideoQueuePage />
          </TabsContent>

          <TabsContent value="projects" className="mt-0">
            <ProjectsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

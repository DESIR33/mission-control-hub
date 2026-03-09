import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVideoSeries, useCreateVideoSeries } from "@/hooks/use-video-series";
import { useVideoTitleMap } from "@/hooks/use-video-title-map";
import { Layers, Plus, Film, DollarSign } from "lucide-react";

export function VideoSeriesDashboard() {
  const { data: series = [], isLoading } = useVideoSeries();
  const createSeries = useCreateVideoSeries();
  const { resolveTitle } = useVideoTitleMap();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSeries.mutate({ name: newName, description: newDesc || undefined }, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewName("");
        setNewDesc("");
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Video Series
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Group videos by series to track revenue per content theme</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Series
        </Button>
      </div>

      {series.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-center">
            <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No video series created yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a series to group related videos and track revenue by theme</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {series.map((s) => (
            <Card key={s.id} className="border-border bg-card hover:bg-accent/5 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <h4 className="text-sm font-medium text-foreground">{s.name}</h4>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    <Film className="w-3 h-3 mr-1" />
                    {s.items?.length ?? 0} videos
                  </Badge>
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground mt-1.5">{s.description}</p>
                )}
                {s.items && s.items.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {s.items.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-[11px] text-muted-foreground truncate">
                        • {getTitle(item.youtube_video_id)}
                      </p>
                    ))}
                    {s.items.length > 3 && (
                      <p className="text-[10px] text-primary">+{s.items.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Video Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Series name (e.g. AI Tool Reviews)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">
              Create Series
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image, Plus, Trophy, BarChart3 } from "lucide-react";
import { useThumbnailAbTests, useCreateThumbnailAbTest, useUpdateThumbnailAbTest } from "@/hooks/use-thumbnail-ab-tests";

export function ThumbnailAbTestTracker() {
  const { data: tests = [] } = useThumbnailAbTests();
  const createTest = useCreateThumbnailAbTest();
  const updateTest = useUpdateThumbnailAbTest();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ youtube_video_id: "", video_title: "", variant_a_url: "", variant_b_url: "" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            Thumbnail A/B Tests
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" /> New Test</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tests.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No thumbnail tests. Track CTR changes when swapping thumbnails.</p>}
        {tests.map((test) => (
          <div key={test.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{test.video_title || test.youtube_video_id}</span>
              <Badge variant={test.status === "running" ? "default" : "secondary"} className="text-xs">{test.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-md border p-2 text-center ${test.winner === "a" ? "border-primary" : "border-border"}`}>
                {test.variant_a_url && <img src={test.variant_a_url} alt="A" className="w-full h-16 object-cover rounded mb-1" />}
                <p className="text-xs font-medium">A</p>
                <p className="text-xs text-muted-foreground">CTR: {test.variant_a_ctr != null ? `${test.variant_a_ctr.toFixed(1)}%` : "—"}</p>
                <p className="text-xs text-muted-foreground">{test.variant_a_impressions} imp.</p>
              </div>
              <div className={`rounded-md border p-2 text-center ${test.winner === "b" ? "border-primary" : "border-border"}`}>
                {test.variant_b_url && <img src={test.variant_b_url} alt="B" className="w-full h-16 object-cover rounded mb-1" />}
                <p className="text-xs font-medium">B</p>
                <p className="text-xs text-muted-foreground">CTR: {test.variant_b_ctr != null ? `${test.variant_b_ctr.toFixed(1)}%` : "—"}</p>
                <p className="text-xs text-muted-foreground">{test.variant_b_impressions} imp.</p>
              </div>
            </div>
            {test.status === "running" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => updateTest.mutate({ id: test.id, winner: "a", status: "completed", ended_at: new Date().toISOString() })}>
                  <Trophy className="h-3 w-3 mr-1" /> A Wins
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => updateTest.mutate({ id: test.id, winner: "b", status: "completed", ended_at: new Date().toISOString() })}>
                  <Trophy className="h-3 w-3 mr-1" /> B Wins
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Thumbnail A/B Test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>YouTube Video ID</Label><Input value={form.youtube_video_id} onChange={(e) => setForm({ ...form, youtube_video_id: e.target.value })} placeholder="e.g. dQw4w9WgXcQ" /></div>
            <div><Label>Video Title</Label><Input value={form.video_title} onChange={(e) => setForm({ ...form, video_title: e.target.value })} /></div>
            <div><Label>Variant A Thumbnail URL</Label><Input value={form.variant_a_url} onChange={(e) => setForm({ ...form, variant_a_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Variant B Thumbnail URL</Label><Input value={form.variant_b_url} onChange={(e) => setForm({ ...form, variant_b_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { createTest.mutate(form); setShowCreate(false); }} disabled={!form.youtube_video_id}>Start Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Plus, Clock, Users, Loader2 } from "lucide-react";
import { useVideoSponsorSegments, useCreateSponsorSegment } from "@/hooks/use-video-performance-alerts";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const segmentTypeLabels: Record<string, { label: string; color: string }> = {
  preroll: { label: "Pre-roll", color: "bg-blue-500/15 text-blue-600" },
  midroll: { label: "Mid-roll", color: "bg-primary/15 text-primary" },
  postroll: { label: "Post-roll", color: "bg-muted text-muted-foreground" },
  dedicated: { label: "Dedicated", color: "bg-green-500/15 text-green-600" },
};

interface Props {
  videoId: string;
}

export function SponsorSegmentTracker({ videoId }: Props) {
  const { data: segments = [], isLoading } = useVideoSponsorSegments(videoId);
  const createSegment = useCreateSponsorSegment();
  const [showAdd, setShowAdd] = useState(false);
  const [startMin, setStartMin] = useState("0");
  const [startSec, setStartSec] = useState("0");
  const [endMin, setEndMin] = useState("0");
  const [endSec, setEndSec] = useState("30");
  const [segType, setSegType] = useState("midroll");

  const handleAdd = () => {
    const start = parseInt(startMin) * 60 + parseInt(startSec);
    const end = parseInt(endMin) * 60 + parseInt(endSec);
    if (end <= start) return;
    createSegment.mutate({ youtube_video_id: videoId, start_seconds: start, end_seconds: end, segment_type: segType }, {
      onSuccess: () => { setShowAdd(false); },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-500" />
          Sponsor Segments
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Segment
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : segments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sponsor segments tracked. Add segments to measure sponsor visibility.</p>
        ) : (
          <div className="space-y-2">
            {segments.map((seg) => {
              const config = segmentTypeLabels[seg.segment_type] ?? segmentTypeLabels.midroll;
              return (
                <div key={seg.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="outline" className={`text-[10px] ${config.color}`}>{config.label}</Badge>
                    <span className="text-xs text-foreground font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatTime(seg.start_seconds)} – {formatTime(seg.end_seconds)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({seg.end_seconds - seg.start_seconds}s)
                    </span>
                  </div>
                  {seg.estimated_viewers != null && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {seg.estimated_viewers.toLocaleString()} viewers
                    </span>
                  )}
                  {seg.retention_at_segment != null && (
                    <span className="text-xs text-muted-foreground">
                      {seg.retention_at_segment.toFixed(1)}% retention
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add Sponsor Segment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Start Time</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={startMin} onChange={(e) => setStartMin(e.target.value)} className="w-20" placeholder="min" />
                <span className="text-muted-foreground">:</span>
                <Input type="number" min={0} max={59} value={startSec} onChange={(e) => setStartSec(e.target.value)} className="w-20" placeholder="sec" />
              </div>
            </div>
            <div>
              <Label>End Time</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={endMin} onChange={(e) => setEndMin(e.target.value)} className="w-20" placeholder="min" />
                <span className="text-muted-foreground">:</span>
                <Input type="number" min={0} max={59} value={endSec} onChange={(e) => setEndSec(e.target.value)} className="w-20" placeholder="sec" />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={segType} onValueChange={setSegType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preroll">Pre-roll</SelectItem>
                  <SelectItem value="midroll">Mid-roll</SelectItem>
                  <SelectItem value="postroll">Post-roll</SelectItem>
                  <SelectItem value="dedicated">Dedicated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createSegment.isPending}>
              {createSegment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

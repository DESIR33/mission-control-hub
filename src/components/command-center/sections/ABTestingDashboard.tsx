import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FlaskConical, Plus, Trophy, RefreshCw, Lightbulb, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useABTestingDashboard, type ABTest } from "@/hooks/use-ab-testing-dashboard";
import { fmtCount } from "@/lib/chart-theme";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

function NewTestDialog({ onCreated }: { onCreated: () => void }) {
  const { createTest } = useABTestingDashboard();
  const [open, setOpen] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [testType, setTestType] = useState<"title" | "thumbnail">("title");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");

  const handleSubmit = () => {
    if (!videoId || !variantA || !variantB) {
      toast.error("Please fill in all fields");
      return;
    }
    createTest.mutate(
      { youtube_video_id: videoId, video_title: videoTitle, test_type: testType, variant_a: variantA, variant_b: variantB },
      {
        onSuccess: () => {
          toast.success("A/B test created!");
          setOpen(false);
          setVideoId("");
          setVideoTitle("");
          setVariantA("");
          setVariantB("");
          onCreated();
        },
        onError: (err) => toast.error(`Failed to create test: ${err.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Test
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
          <DialogDescription>Test different titles or thumbnails to optimize CTR.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Video ID</Label>
              <Input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="YouTube Video ID" />
            </div>
            <div className="space-y-1.5">
              <Label>Video Title</Label>
              <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Optional label" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Test Type</Label>
            <Select value={testType} onValueChange={(v) => setTestType(v as "title" | "thumbnail")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="thumbnail">Thumbnail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Variant A</Label>
            <Input value={variantA} onChange={(e) => setVariantA(e.target.value)} placeholder={testType === "title" ? "First title option" : "Thumbnail A description/URL"} />
          </div>
          <div className="space-y-1.5">
            <Label>Variant B</Label>
            <Input value={variantB} onChange={(e) => setVariantB(e.target.value)} placeholder={testType === "title" ? "Second title option" : "Thumbnail B description/URL"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTest.isPending}>
            {createTest.isPending ? "Creating..." : "Create Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestCard({ test, onEnd }: { test: ABTest; onEnd: (testId: string, winner: "a" | "b") => void }) {
  const isActive = test.status === "active";
  const aWins = test.winner === "a";
  const bWins = test.winner === "b";
  const runningTime = isActive
    ? safeFormatDistanceToNow(test.started_at, { addSuffix: false })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Completed"}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">{test.test_type}</Badge>
        </div>
        {runningTime && (
          <span className="text-xs text-muted-foreground">Running {runningTime}</span>
        )}
        {test.winner && (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Trophy className="w-3.5 h-3.5" />
            Variant {test.winner.toUpperCase()} wins
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-foreground truncate">
        {test.video_title || test.youtube_video_id}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Variant A */}
        <div
          className={`rounded-lg border p-3 space-y-2 ${
            aWins ? "border-green-500/50 bg-green-500/5" : bWins ? "border-red-500/30 bg-red-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Variant A</span>
            {aWins && <Trophy className="w-3 h-3 text-green-500" />}
          </div>
          <p className="text-xs text-foreground line-clamp-2">{test.variant_a}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>CTR: <strong className="text-foreground">{test.variant_a_ctr?.toFixed(1) ?? "—"}%</strong></span>
            <span>Views: <strong className="text-foreground">{test.variant_a_views != null ? fmtCount(test.variant_a_views) : "—"}</strong></span>
          </div>
        </div>

        {/* Variant B */}
        <div
          className={`rounded-lg border p-3 space-y-2 ${
            bWins ? "border-green-500/50 bg-green-500/5" : aWins ? "border-red-500/30 bg-red-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Variant B</span>
            {bWins && <Trophy className="w-3 h-3 text-green-500" />}
          </div>
          <p className="text-xs text-foreground line-clamp-2">{test.variant_b}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>CTR: <strong className="text-foreground">{test.variant_b_ctr?.toFixed(1) ?? "—"}%</strong></span>
            <span>Views: <strong className="text-foreground">{test.variant_b_views != null ? fmtCount(test.variant_b_views) : "—"}</strong></span>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="text-xs text-green-500 border-green-500/30" onClick={() => onEnd(test.id, "a")}>
            A Wins
          </Button>
          <Button size="sm" variant="outline" className="text-xs text-green-500 border-green-500/30" onClick={() => onEnd(test.id, "b")}>
            B Wins
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function ABTestingDashboard() {
  const {
    activeTests, completedTests, learnings, refreshCandidates, isLoading, endTest,
  } = useABTestingDashboard();

  const handleEnd = (testId: string, winner: "a" | "b") => {
    endTest.mutate(
      { testId, winner },
      {
        onSuccess: () => toast.success("Test completed! Winner recorded."),
        onError: (err) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">A/B Testing Dashboard</h2>
        </div>
        <NewTestDialog onCreated={() => {}} />
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Tests ({activeTests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTests.length})
          </TabsTrigger>
          <TabsTrigger value="learnings">Learnings</TabsTrigger>
          <TabsTrigger value="refresh">Refresh Candidates</TabsTrigger>
        </TabsList>

        {/* Active Tests */}
        <TabsContent value="active" className="space-y-3">
          {activeTests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center"
            >
              <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active A/B tests. Create one to start optimizing.</p>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeTests.map((test) => (
                <TestCard key={test.id} test={test} onEnd={handleEnd} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tests */}
        <TabsContent value="completed" className="space-y-3">
          {completedTests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">No completed tests yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {completedTests.map((test) => (
                <TestCard key={test.id} test={test} onEnd={handleEnd} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Learnings */}
        <TabsContent value="learnings" className="space-y-3">
          {learnings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Complete more A/B tests to unlock pattern insights.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {learnings.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {l.category}
                    </p>
                    <p className="text-sm text-foreground">{l.insight}</p>
                    <p className="text-xs text-muted-foreground mt-1">Based on {l.dataPoints} test(s)</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Refresh Candidates */}
        <TabsContent value="refresh" className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Videos with &gt;1,000 impressions but &lt;3% CTR — consider refreshing thumbnails or titles.
          </p>
          {refreshCandidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No underperforming videos found. Great job!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {refreshCandidates.map((c, i) => (
                <motion.div
                  key={c.youtube_video_id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.video_title}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{fmtCount(c.impressions)} impressions</span>
                      <span className="text-red-400">{c.ctr.toFixed(1)}% CTR</span>
                      <span>{fmtCount(c.views)} views</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

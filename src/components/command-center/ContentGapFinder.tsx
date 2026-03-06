import { useState } from "react";
import {
  Search, Plus, Lightbulb, Target, ArrowRight,
  Trash2, FileText, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContentGaps, useCreateContentGap, useUpdateContentGap, useDeleteContentGap } from "@/hooks/use-content-gaps";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  identified: "secondary",
  planned: "default",
  in_production: "default",
  published: "default",
  dismissed: "outline",
};

const competitionColor: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

export function ContentGapFinder() {
  const { data: gaps = [], isLoading } = useContentGaps();
  const createGap = useCreateContentGap();
  const updateGap = useUpdateContentGap();
  const deleteGap = useDeleteContentGap();

  const [newTopic, setNewTopic] = useState("");
  const [newSource, setNewSource] = useState("manual");
  const [newCompetition, setNewCompetition] = useState<"low" | "medium" | "high">("medium");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!newTopic.trim()) return;
    createGap.mutate(
      { topic: newTopic, source: newSource, competition: newCompetition, status: "identified" },
      {
        onSuccess: () => {
          setNewTopic("");
          setShowAdd(false);
          toast.success("Content gap added");
        },
      }
    );
  };

  const statusCounts = gaps.reduce(
    (acc, g) => {
      acc[g.status] = (acc[g.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Gaps</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{gaps.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Identified</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{statusCounts.identified ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">In Production</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{statusCounts.in_production ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Published</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{statusCounts.published ?? 0}</p>
        </div>
      </div>

      {/* Add New Gap */}
      <div className="rounded-lg border border-border bg-card p-4">
        {showAdd ? (
          <div className="space-y-3">
            <input
              className="w-full bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
              placeholder="Topic or keyword..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex items-center gap-2">
              <select
                className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
              >
                <option value="manual">Manual</option>
                <option value="audience_comments">Comments</option>
                <option value="competitor">Competitor</option>
                <option value="trend">Trend</option>
              </select>
              <select
                className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
                value={newCompetition}
                onChange={(e) => setNewCompetition(e.target.value as any)}
              >
                <option value="low">Low Competition</option>
                <option value="medium">Medium Competition</option>
                <option value="high">High Competition</option>
              </select>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={createGap.isPending}>Add</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Content Gap
          </Button>
        )}
      </div>

      {/* Gap List */}
      <div className="space-y-2">
        {gaps.map((gap) => (
          <div key={gap.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{gap.topic}</p>
                <div className="flex items-center gap-2 mt-1">
                  {gap.competition && (
                    <span className={`text-xs ${competitionColor[gap.competition]}`}>
                      {gap.competition} competition
                    </span>
                  )}
                  {gap.source && (
                    <span className="text-xs text-muted-foreground">via {gap.source}</span>
                  )}
                </div>
              </div>
              <select
                className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
                value={gap.status}
                onChange={(e) =>
                  updateGap.mutate({ id: gap.id, status: e.target.value as any })
                }
              >
                <option value="identified">Identified</option>
                <option value="planned">Planned</option>
                <option value="in_production">In Production</option>
                <option value="published">Published</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <button
                className="text-muted-foreground hover:text-red-500 transition-colors"
                onClick={() => {
                  deleteGap.mutate(gap.id, {
                    onSuccess: () => toast.success("Gap removed"),
                  });
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {gaps.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>No content gaps identified yet. Add topics your audience wants to see!</p>
          </div>
        )}
      </div>
    </div>
  );
}

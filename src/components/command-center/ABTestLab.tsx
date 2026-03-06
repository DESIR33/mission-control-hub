import { useState, useMemo } from "react";
import { FlaskConical, Plus, Trophy, ArrowRight, Crown, BarChart3, X, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export function ABTestLab() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"title" | "thumbnail">("title");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [ctrBefore, setCtrBefore] = useState("");

  // ── Queries ──────────────────────────────────────────────

  const { data: allExperiments = [], isLoading } = useQuery({
    queryKey: ["all-experiments", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_experiments" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: topCtrVideos = [] } = useQuery({
    queryKey: ["top-ctr-videos", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_stats" as any)
        .select("youtube_video_id, title, ctr_percent, views")
        .eq("workspace_id", workspaceId!)
        .order("ctr_percent", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  // ── Mutations ────────────────────────────────────────────

  const createExperiment = useMutation({
    mutationFn: async (exp: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("video_experiments" as any)
        .insert({ ...exp, workspace_id: workspaceId, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-experiments"] }),
  });

  const endExperiment = useMutation({
    mutationFn: async ({ id, winner, ctrAfter }: { id: string; winner: "a" | "b"; ctrAfter?: number }) => {
      const { error } = await supabase
        .from("video_experiments" as any)
        .update({ winner, ended_at: new Date().toISOString(), ctr_after: ctrAfter } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-experiments"] }),
  });

  // ── Derived data ─────────────────────────────────────────

  const activeTests = useMemo(
    () => allExperiments.filter((e: any) => !e.ended_at),
    [allExperiments],
  );

  const pastTests = useMemo(
    () => allExperiments.filter((e: any) => !!e.ended_at),
    [allExperiments],
  );

  const insights = useMemo(() => {
    if (pastTests.length === 0) return null;

    const titleTests = pastTests.filter((e: any) => e.experiment_type === "title");
    const thumbnailTests = pastTests.filter((e: any) => e.experiment_type === "thumbnail");

    const improvements = pastTests
      .filter((e: any) => e.ctr_before != null && e.ctr_after != null && e.ctr_before > 0)
      .map((e: any) => ((e.ctr_after - e.ctr_before) / e.ctr_before) * 100);

    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((a: number, b: number) => a + b, 0) / improvements.length
        : 0;

    const bestTest = pastTests.reduce(
      (best: any, e: any) => {
        if (e.ctr_before == null || e.ctr_after == null || e.ctr_before === 0) return best;
        const imp = ((e.ctr_after - e.ctr_before) / e.ctr_before) * 100;
        return imp > (best?.improvement ?? -Infinity) ? { ...e, improvement: imp } : best;
      },
      null as any,
    );

    return {
      titleCount: titleTests.length,
      thumbnailCount: thumbnailTests.length,
      avgImprovement,
      bestTest,
    };
  }, [pastTests]);

  // ── Handlers ─────────────────────────────────────────────

  const handleCreate = () => {
    if (!variantA.trim() || !variantB.trim()) return;
    createExperiment.mutate({
      experiment_type: formType,
      variant_a: variantA.trim(),
      variant_b: variantB.trim(),
      ctr_before: ctrBefore ? parseFloat(ctrBefore) : null,
      started_at: new Date().toISOString(),
    });
    setVariantA("");
    setVariantB("");
    setCtrBefore("");
    setShowForm(false);
  };

  const handleDeclareWinner = (id: string, winner: "a" | "b") => {
    endExperiment.mutate({ id, winner });
  };

  const fmtCtr = (v: number | null | undefined) =>
    v != null ? `${Number(v).toFixed(2)}%` : "—";

  const fmtViews = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(Math.round(n));
  };

  // ── Loading state ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-foreground">A/B Test Lab</h2>
          <Badge variant="outline" className="text-xs">
            {activeTests.length} active
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showForm ? "Cancel" : "New Test"}
        </Button>
      </div>

      {/* ── New Test Form ────────────────────────────────── */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Create New Experiment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={formType === "title" ? "default" : "outline"}
                onClick={() => setFormType("title")}
              >
                Title
              </Button>
              <Button
                size="sm"
                variant={formType === "thumbnail" ? "default" : "outline"}
                onClick={() => setFormType("thumbnail")}
              >
                Thumbnail
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Variant A</label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Variant A text..."
                  value={variantA}
                  onChange={(e) => setVariantA(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Variant B</label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Variant B text..."
                  value={variantB}
                  onChange={(e) => setVariantB(e.target.value)}
                />
              </div>
            </div>
            <div className="max-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">CTR Before (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g. 4.5"
                value={ctrBefore}
                onChange={(e) => setCtrBefore(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!variantA.trim() || !variantB.trim() || createExperiment.isPending}
            >
              {createExperiment.isPending ? "Creating..." : "Create Experiment"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Active Tests ─────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Active Tests
        </h3>
        {activeTests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No active experiments. Start one above!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeTests.map((exp: any) => (
              <Card key={exp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={
                        exp.experiment_type === "title"
                          ? "border-blue-500/30 text-blue-400"
                          : "border-pink-500/30 text-pink-400"
                      }
                    >
                      {exp.experiment_type === "title" ? "Title" : "Thumbnail"}
                    </Badge>
                    {exp.winner && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Trophy className="w-3 h-3 mr-1" />
                        Winner: Variant {exp.winner.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="rounded-md border border-border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Variant A</p>
                      <p className="text-sm text-foreground line-clamp-2">{exp.variant_a}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="rounded-md border border-border bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Variant B</p>
                      <p className="text-sm text-foreground line-clamp-2">{exp.variant_b}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>CTR Before: <span className="text-foreground font-medium">{fmtCtr(exp.ctr_before)}</span></span>
                    <span>CTR After: <span className="text-foreground font-medium">{fmtCtr(exp.ctr_after)}</span></span>
                  </div>

                  {!exp.winner && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => handleDeclareWinner(exp.id, "a")}
                        disabled={endExperiment.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        A Wins
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => handleDeclareWinner(exp.id, "b")}
                        disabled={endExperiment.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        B Wins
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Pattern Insights ─────────────────────────────── */}
      {insights && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-400" />
              Pattern Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Title Tests
                </p>
                <p className="text-lg font-bold font-mono text-foreground">{insights.titleCount}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Thumbnail Tests
                </p>
                <p className="text-lg font-bold font-mono text-foreground">{insights.thumbnailCount}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Avg CTR Improvement
                </p>
                <p
                  className={`text-lg font-bold font-mono ${
                    insights.avgImprovement >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {insights.avgImprovement >= 0 ? "+" : ""}
                  {insights.avgImprovement.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Best Pattern
                </p>
                {insights.bestTest ? (
                  <>
                    <Badge
                      variant="outline"
                      className="text-xs mb-1"
                    >
                      {insights.bestTest.experiment_type}
                    </Badge>
                    <p className="text-xs text-foreground line-clamp-1">
                      Variant {insights.bestTest.winner?.toUpperCase()} (+{insights.bestTest.improvement.toFixed(1)}%)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Test History ─────────────────────────────────── */}
      {pastTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Test History
          </h3>
          <div className="space-y-2">
            {pastTests.map((exp: any) => {
              const improvement =
                exp.ctr_before != null && exp.ctr_after != null && exp.ctr_before > 0
                  ? ((exp.ctr_after - exp.ctr_before) / exp.ctr_before) * 100
                  : null;

              return (
                <Card key={exp.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={
                            exp.experiment_type === "title"
                              ? "border-blue-500/30 text-blue-400 shrink-0"
                              : "border-pink-500/30 text-pink-400 shrink-0"
                          }
                        >
                          {exp.experiment_type === "title" ? "Title" : "Thumbnail"}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-sm min-w-0">
                          <span
                            className={`truncate ${
                              exp.winner === "a" ? "text-yellow-400 font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {exp.variant_a}
                          </span>
                          <span className="text-muted-foreground shrink-0">vs</span>
                          <span
                            className={`truncate ${
                              exp.winner === "b" ? "text-yellow-400 font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {exp.variant_b}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {exp.winner && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            <Trophy className="w-3 h-3 mr-1" />
                            {exp.winner.toUpperCase()} won
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {fmtCtr(exp.ctr_before)} → {fmtCtr(exp.ctr_after)}
                        </div>
                        {improvement != null && (
                          <Badge
                            variant="outline"
                            className={
                              improvement >= 0
                                ? "border-green-500/30 text-green-400 text-xs"
                                : "border-red-500/30 text-red-400 text-xs"
                            }
                          >
                            {improvement >= 0 ? "+" : ""}
                            {improvement.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CTR Leaderboard ──────────────────────────────── */}
      {topCtrVideos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              CTR Leaderboard — Top 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {topCtrVideos.map((v: any, i: number) => (
                <div
                  key={v.youtube_video_id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span
                    className={`text-xs font-bold w-5 text-center shrink-0 ${
                      i === 0
                        ? "text-yellow-400"
                        : i === 1
                          ? "text-muted-foreground"
                          : i === 2
                            ? "text-amber-600"
                            : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground truncate flex-1 min-w-0">
                    {v.title || v.youtube_video_id}
                  </p>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {fmtViews(v.views ?? 0)} views
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0 font-mono">
                    {Number(v.ctr_percent).toFixed(2)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

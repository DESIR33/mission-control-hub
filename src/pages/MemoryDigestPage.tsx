import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  Mail, Save, Eye, Clock, Brain, AlertTriangle, Archive,
  HeartPulse, CheckCircle2, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const query = (table: string) => (supabase as any).from(table);

interface DigestSettings {
  frequency: "daily" | "weekly";
  delivery_time: string;
  agent_scope: string[];
  include_new_memories: boolean;
  include_conflicts: boolean;
  include_stale: boolean;
  include_consolidations: boolean;
  include_health_score: boolean;
}

const DEFAULT_SETTINGS: DigestSettings = {
  frequency: "daily",
  delivery_time: "08:00",
  agent_scope: ["global", "claude", "chatgpt", "gemini"],
  include_new_memories: true,
  include_conflicts: true,
  include_stale: true,
  include_consolidations: true,
  include_health_score: true,
};

const AGENTS = ["global", "claude", "chatgpt", "gemini"];

interface DigestContent {
  generated_at: string;
  frequency: string;
  summary: string;
  new_memories: any[];
  conflicts: any[];
  stale_memories: any[];
  health: { total_memories: number; avg_confidence: number; stale_count: number } | null;
}

export default function MemoryDigestPage() {
  const { workspaceId } = useWorkspace();
  const [settings, setSettings] = useState<DigestSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<DigestContent | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [viewingHistory, setViewingHistory] = useState<DigestContent | null>(null);

  // Load settings
  useEffect(() => {
    if (!workspaceId) return;
    query("digest_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setSettings({
            frequency: data.frequency,
            delivery_time: data.delivery_time,
            agent_scope: data.agent_scope || DEFAULT_SETTINGS.agent_scope,
            include_new_memories: data.include_new_memories,
            include_conflicts: data.include_conflicts,
            include_stale: data.include_stale,
            include_consolidations: data.include_consolidations,
            include_health_score: data.include_health_score,
          });
        }
      });
  }, [workspaceId]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await query("digest_history")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("generated_at", { ascending: false })
      .limit(5);
    setHistory(data || []);
  }, [workspaceId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const saveSettings = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const { error } = await query("digest_settings")
        .upsert({
          workspace_id: workspaceId,
          ...settings,
        }, { onConflict: "workspace_id" });
      if (error) throw error;
      toast.success("Digest settings saved");
    } catch (e: any) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateDigest = async () => {
    if (!workspaceId) return;
    setGenerating(true);
    setPreview(null);
    setViewingHistory(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-digest", {
        body: { workspace_id: workspaceId, settings },
      });
      if (error) throw error;
      setPreview(data);
      await loadHistory();
      toast.success("Digest generated");
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleAgent = (agent: string) => {
    setSettings((prev) => ({
      ...prev,
      agent_scope: prev.agent_scope.includes(agent)
        ? prev.agent_scope.filter((a) => a !== agent)
        : [...prev.agent_scope, agent],
    }));
  };

  const displayDigest = viewingHistory || preview;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Memory Digest</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure and preview your memory activity digest.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Digest Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Frequency */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Frequency</Label>
                <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
                  {(["daily", "weekly"] as const).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={settings.frequency === f ? "default" : "ghost"}
                      className="flex-1 h-8 text-xs capitalize"
                      onClick={() => setSettings((p) => ({ ...p, frequency: f }))}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Delivery time */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={settings.delivery_time}
                    onChange={(e) => setSettings((p) => ({ ...p, delivery_time: e.target.value }))}
                    className="w-32 h-8 text-xs"
                  />
                </div>
              </div>

              <Separator />

              {/* Agent scope */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Agent Scope</Label>
                <div className="flex flex-wrap gap-2">
                  {AGENTS.map((a) => (
                    <Button
                      key={a}
                      size="sm"
                      variant={settings.agent_scope.includes(a) ? "default" : "outline"}
                      className="h-7 text-xs capitalize"
                      onClick={() => toggleAgent(a)}
                    >
                      {a}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Content toggles */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Content Sections</Label>
                {[
                  { key: "include_new_memories", label: "New memories added", icon: Brain },
                  { key: "include_conflicts", label: "Conflicts detected & resolved", icon: AlertTriangle },
                  { key: "include_stale", label: "Stale memories (30+ days)", icon: Archive },
                  { key: "include_consolidations", label: "Consolidations performed", icon: CheckCircle2 },
                  { key: "include_health_score", label: "Memory health summary", icon: HeartPulse },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                    <Switch
                      checked={(settings as any)[key]}
                      onCheckedChange={(v) => setSettings((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={saveSettings} disabled={saving} className="w-full gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview + History */}
        <div className="space-y-4">
          <Button
            onClick={generateDigest}
            disabled={generating}
            variant="outline"
            className="w-full gap-1.5"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            {generating ? "Generating…" : "Preview Digest"}
          </Button>

          {/* Digest Preview */}
          {displayDigest && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground">
                    {viewingHistory ? "Historical Digest" : "Digest Preview"}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {format(new Date(displayDigest.generated_at), "MMM d, yyyy h:mm a")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-2">
                  <div className="space-y-4">
                    {/* AI Summary */}
                    {displayDigest.summary && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Executive Summary</p>
                        <p className="text-sm text-foreground leading-relaxed">{displayDigest.summary}</p>
                      </div>
                    )}

                    {/* New memories */}
                    {displayDigest.new_memories?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs font-semibold text-foreground">
                            New Memories Added ({displayDigest.new_memories.length})
                          </span>
                        </div>
                        {displayDigest.new_memories.slice(0, 8).map((m: any, i: number) => (
                          <div key={i} className="rounded bg-muted/30 px-3 py-2 flex items-start gap-2">
                            <p className="text-xs font-mono text-muted-foreground flex-1 line-clamp-2">{m.content}</p>
                            <Badge variant="outline" className="text-[9px] shrink-0">{m.agent_id}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Conflicts */}
                    {displayDigest.conflicts?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-foreground">
                            Conflicts ({displayDigest.conflicts.length})
                          </span>
                        </div>
                        {displayDigest.conflicts.slice(0, 5).map((c: any, i: number) => (
                          <div key={i} className="rounded bg-muted/30 px-3 py-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] capitalize">{c.conflict_type}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${c.status === "resolved" ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}
                            >
                              {c.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(c.detected_at), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stale */}
                    {displayDigest.stale_memories?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Archive className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-semibold text-foreground">
                            Stale Memories ({displayDigest.stale_memories.length})
                          </span>
                        </div>
                        {displayDigest.stale_memories.slice(0, 5).map((m: any, i: number) => (
                          <div key={i} className="rounded bg-muted/30 px-3 py-2">
                            <p className="text-xs font-mono text-muted-foreground line-clamp-1">{m.content}</p>
                            <span className="text-[10px] text-red-400">
                              Last retrieved: {m.last_accessed_at ? formatDistanceToNow(new Date(m.last_accessed_at), { addSuffix: true }) : "never"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Health */}
                    {displayDigest.health && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-foreground">Memory Health</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold font-mono text-foreground">{displayDigest.health.total_memories}</p>
                            <p className="text-[10px] text-muted-foreground">Total</p>
                          </div>
                          <div className="rounded bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold font-mono text-foreground">
                              {(displayDigest.health.avg_confidence * 100).toFixed(0)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">Avg Conf</p>
                          </div>
                          <div className="rounded bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold font-mono text-foreground">{displayDigest.health.stale_count}</p>
                            <p className="text-[10px] text-muted-foreground">Stale</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!displayDigest.new_memories?.length && !displayDigest.conflicts?.length && !displayDigest.stale_memories?.length && !displayDigest.health && (
                      <p className="text-sm text-muted-foreground text-center py-8">No activity in the configured window.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Digests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No digests generated yet.</p>
              )}
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-2">
                  <div>
                    <span className="text-xs text-foreground">
                      {format(new Date(h.generated_at), "MMM d, yyyy h:mm a")}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(h.generated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setViewingHistory(h.content_json as DigestContent);
                      setPreview(null);
                    }}
                  >
                    <Eye className="h-3 w-3" /> View
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
